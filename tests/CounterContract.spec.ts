import { fromNano } from '@ton/core';
import {CounterContract, CounterContractConfig} from '../wrappers/CounterContract';
import '@ton/test-utils';
import {balanceSpentAvg, checkContract, createContract, getAnnualSpendings, getBalance} from "./utils";
import {Blockchain, SandboxContract} from "@ton/sandbox";

describe('CounterContract', () => {

    let blockchain:Blockchain;
    let contract_v1:SandboxContract<CounterContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        const cfg:CounterContractConfig = {
            counter_1_initial_value: 0,
            counter_2_initial_value: 10,
            counter_3_initial_value: 20
        };
        contract_v1 = await createContract(blockchain, "CounterContract", cfg);
    });

    it('should all contracts work correct', async () => {
        await checkContract(contract_v1, blockchain);
    });



    it('should improve spendings', async () => {
        const v1_spendings = await getAnnualSpendings(contract_v1, blockchain)
        console.log(`Spent overall annually for V1 : ${fromNano(v1_spendings)}`);
    });
});