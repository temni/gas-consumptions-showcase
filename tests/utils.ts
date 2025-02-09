import {beginCell, Cell, fromNano} from "@ton/core";
import {CounterContract, CounterContractConfig} from "../wrappers/CounterContract";
import {Blockchain, SandboxContract, TreasuryContract} from "@ton/sandbox";
import path from "path";
import fs from "fs";

export function c1Cell(config: CounterContractConfig): Cell {
    return beginCell()
        .storeUint(config.counter_1_initial_value, 32)
        .storeUint(config.counter_2_initial_value, 32)
        .storeUint(config.counter_3_initial_value, 32)
        .storeUint(config.counter_1_initial_value, 32)
        .storeUint(config.counter_2_initial_value, 32)
        .storeUint(config.counter_3_initial_value, 32)
        .endCell();
}

export function c3Cell(config: CounterContractConfig): Cell {
    return beginCell()
        .storeUint(config.counter_1_initial_value, 32)
        .storeUint(config.counter_2_initial_value, 32)
        .storeUint(config.counter_3_initial_value, 32)
        .storeRef(beginCell()
            .storeUint(config.counter_1_initial_value, 32)
            .storeUint(config.counter_2_initial_value, 32)
            .storeUint(config.counter_3_initial_value, 32)
            .endCell())
        .endCell();
}

function buildDataCell(name: string, cfg:CounterContractConfig): Cell {
    switch (name) {
        case "CounterContract": {
            return c1Cell(cfg)
        }
        case "CounterContract_V2": {
            return c1Cell(cfg)
        }
        case "CounterContract_V3": {
            return c3Cell(cfg)
        }
        case "CounterContract_V4": {
            return c1Cell(cfg)
        }
        default:
            throw Error("Unknown")
    }
}

export type callable = () => Promise<any>;
export type getBalance = () => Promise<bigint>;
export async function balanceSpentAvg(f:callable, gb:getBalance):Promise<bigint> {
    const ib = await gb();
    await f();
    return Promise.resolve(ib - (await gb()));
}

const loadCode = (relativePath: string): Cell => {
    const filePath = path.join(__dirname, relativePath)
    const rawJson = fs.readFileSync(filePath, 'utf8');
    const hexCode = JSON.parse(rawJson)['hex'];
    return Cell.fromHex(hexCode);
}

export async function createContract(blockchain: Blockchain, name: string, cfg: CounterContractConfig) {
    let deployer: SandboxContract<TreasuryContract> = await blockchain.treasury('deployer');
    let counterContract: SandboxContract<CounterContract> = blockchain.openContract(
        CounterContract.createFromConfig(buildDataCell(name, cfg), loadCode("../build/" + name + ".compiled.json")));
    const deployResult = await counterContract.sendDeploy(deployer.getSender());
    expect(deployResult.transactions).toHaveTransaction({
        from: deployer.address,
        to: counterContract.address,
        deploy: true,
        success: true,
    });
    return counterContract;
}

export async function getAnnualSpendings(contract: SandboxContract<CounterContract>, blockchain: Blockchain) {
    const increaser = await blockchain.treasury('increaser');
    const gb:getBalance = () => increaser.getBalance();
    const c1:bigint = await balanceSpentAvg(
        () => contract.sendIncrease(increaser.getSender(), {  counterNumber: 1, increaseBy: 14 }), gb);
    const c2:bigint = await balanceSpentAvg(
        () => contract.sendIncrease(increaser.getSender(), {  counterNumber: 2, increaseBy: 14 }), gb);
    const c3:bigint = await balanceSpentAvg(
        () => contract.sendIncrease(increaser.getSender(), {  counterNumber: 3, increaseBy: 14 }), gb);
    /*console.log(`Gas spent on IncreaseCounter#1: ${fromNano(c1)}`);
    console.log(`Gas spent on IncreaseCounter#2: ${fromNano(c2)}`);
    console.log(`Gas spent on IncreaseCounter#3: ${fromNano(c3)}`);*/

    const freqC1Daily = 1000n;
    const freqC2Daily = 2000n;
    const freqC3Daily = 3000n;

    return (freqC1Daily * c1 + freqC2Daily * c2 + freqC3Daily * c3) * 365n;
}

export async function checkContract(contract: SandboxContract<CounterContract>, blockchain: Blockchain) {
    const increaser = await blockchain.treasury('increaser');
    let counterBefore = await contract.getCounters();
    expect(counterBefore).toHaveLength(3);
    expect(counterBefore).toEqual([0, 10, 20]);
    let increaseResult = await contract.sendIncrease(increaser.getSender(), {  counterNumber: 1, increaseBy: 65 });
    expect(increaseResult.transactions).toHaveTransaction({
        from: increaser.address,
        to: contract.address,
        success: true,
    });
    expect(increaseResult.transactions).toHaveTransaction({
        from: contract.address,
        to: increaser.address,
        success: true,
    });
    expect(await contract.getCounters()).toEqual([65, 10 ,20]);

    await contract.sendIncrease(increaser.getSender(), {  counterNumber: 2, increaseBy: 14 });
    expect(await contract.getCounters()).toEqual([65, 24, 20]);

    await contract.sendFlush(increaser.getSender(), {  counterNumber: 1 });
    expect(await contract.getCounters()).toEqual([0, 24, 20]);

    await contract.sendFlush(increaser.getSender(), {  counterNumber: 3 });
    expect(await contract.getCounters()).toEqual([0, 24, 20]);

    await contract.sendFlush(increaser.getSender(), {  counterNumber: 2 });
    expect(await contract.getCounters()).toEqual([0, 10, 20]);

    await contract.sendIncrease(increaser.getSender(), {  counterNumber: 3, increaseBy: 10020 });
    expect(await contract.getCounters()).toEqual([0, 10, 10040]);
}