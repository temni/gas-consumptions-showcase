import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import {Cell, fromNano, toNano} from '@ton/core';
import { CounterContract } from '../wrappers/CounterContract';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import {max, median, min} from "extra-bigint";

describe('CounterContract', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('CounterContract');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let counterContract: SandboxContract<CounterContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        counterContract = blockchain.openContract(
            CounterContract.createFromConfig(
                {
                    counter_1_initial_value: 0,
                    counter_2_initial_value: 10,
                    counter_3_initial_value: 20
                },
                code
            )
        );

        deployer = await blockchain.treasury('deployer');

        const deployResult = await counterContract.sendDeploy(deployer.getSender());

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: counterContract.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and counterContract are ready to use
    });

    it('should increase counter', async () => {
        const increaser = await blockchain.treasury('increaser');
        let counterBefore = await counterContract.getCounters();
        console.log('counters before increasing', counterBefore);
        expect(counterBefore).toHaveLength(3);
        expect(counterBefore).toEqual([0, 10, 20]);
        let increaseResult = await counterContract.sendIncrease(increaser.getSender(), {  counterNumber: 1, increaseBy: 65 });
        expect(increaseResult.transactions).toHaveTransaction({
            from: increaser.address,
            to: counterContract.address,
            success: true,
        });
        expect(increaseResult.transactions).toHaveTransaction({
            from: counterContract.address,
            to: increaser.address,
            success: true,
        });
        expect(await counterContract.getCounters()).toEqual([65, 10 ,20]);

        await counterContract.sendIncrease(increaser.getSender(), {  counterNumber: 2, increaseBy: 14 });
        expect(await counterContract.getCounters()).toEqual([65, 24, 20]);

        await counterContract.sendFlush(increaser.getSender(), {  counterNumber: 1 });
        expect(await counterContract.getCounters()).toEqual([0, 24, 20]);

        await counterContract.sendFlush(increaser.getSender(), {  counterNumber: 3 });
        expect(await counterContract.getCounters()).toEqual([0, 24, 20]);

        await counterContract.sendFlush(increaser.getSender(), {  counterNumber: 2 });
        expect(await counterContract.getCounters()).toEqual([0, 10, 20]);

        await counterContract.sendIncrease(increaser.getSender(), {  counterNumber: 3, increaseBy: 10020 });
        expect(await counterContract.getCounters()).toEqual([0, 10, 10040]);
    });



    it('check spendings for increaser', async () => {
        const increaser = await blockchain.treasury('increaser');
        const gb:getBalance = () => increaser.getBalance();
        const c1:bigint = await balanceSpentAvg(
            () => counterContract.sendIncrease(increaser.getSender(), {  counterNumber: 1, increaseBy: 14 }),
            gb);
        const c2:bigint = await balanceSpentAvg(
            () => counterContract.sendIncrease(increaser.getSender(), {  counterNumber: 2, increaseBy: 14 }),
            gb);
        const c3:bigint = await balanceSpentAvg(
            () => counterContract.sendIncrease(increaser.getSender(), {  counterNumber: 3, increaseBy: 14 }),
            gb);
        console.log(`Gas spent on IncreaseCounter#1: ${fromNano(c1)}`);
        console.log(`Gas spent on IncreaseCounter#2: ${fromNano(c2)}`);
        console.log(`Gas spent on IncreaseCounter#3: ${fromNano(c3)}`);

        const freqC1Daily = 1000n;
        const freqC2Daily = 2000n;
        const freqC3Daily = 3000n;

        console.log(`Spent overall annually: ${fromNano((freqC1Daily * c1 + freqC2Daily * c2 + freqC3Daily * c3) * 365n)}`);

    });
});

export type callable = () => Promise<any>;
export type getBalance = () => Promise<bigint>;
async function balanceSpentAvg(f:callable, gb:getBalance):Promise<bigint> {
    const ib = await gb();
    await f();
    return Promise.resolve(ib - (await gb()));
}