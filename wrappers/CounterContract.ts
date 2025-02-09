import {Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode, toNano} from '@ton/core';

export type CounterContractConfig = {
    counter_1_initial_value: number;
    counter_2_initial_value: number;
    counter_3_initial_value: number;
};

export function counterContractConfigToCell(config: CounterContractConfig): Cell {
    return beginCell()
        .storeUint(config.counter_1_initial_value, 32)
        .storeUint(config.counter_2_initial_value, 32)
        .storeUint(config.counter_3_initial_value, 32)
        .storeUint(config.counter_1_initial_value, 32)
        .storeUint(config.counter_2_initial_value, 32)
        .storeUint(config.counter_3_initial_value, 32)
        .endCell();
}

export const Opcodes = {
    increase: 0x7e8764ef,
    flush: 0x12b2b62e
};

export class CounterContract implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new CounterContract(address);
    }

    static createFromConfig(config: CounterContractConfig, code: Cell, workchain = 0) {
        const data = counterContractConfigToCell(config);
        const init = { code, data };
        return new CounterContract(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value?: bigint) {
        await provider.internal(via, {
            value: value ?? toNano(0.5),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendIncrease(
        provider: ContractProvider,
        via: Sender,
        opts: {
            counterNumber: number;
            increaseBy: number;
            value?: bigint;
            queryID?: number;
        }
    ) {
        await provider.internal(via, {
            value: opts.value ?? toNano(1),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.increase, 32)
                .storeUint(opts.queryID ?? new Date().getMilliseconds(), 64)
                .storeUint(opts.counterNumber, 32)
                .storeUint(opts.increaseBy, 32)
                .endCell(),
        });
    }

    async sendFlush(
        provider: ContractProvider,
        via: Sender,
        opts: {
            counterNumber: number;
            value?: bigint;
            queryID?: number;
        }
    ) {
        await provider.internal(via, {
            value: opts.value ?? toNano(0.5),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.flush, 32)
                .storeUint(opts.queryID ?? new Date().getMilliseconds(), 64)
                .storeUint(opts.counterNumber, 32)
                .endCell(),
        });
    }

    async getCounters(provider: ContractProvider): Promise<number[]> {
        const result = await provider.get('get_counters', []);
        return [result.stack.readNumber(), result.stack.readNumber(), result.stack.readNumber()];
    }
}
