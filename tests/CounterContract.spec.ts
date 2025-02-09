import { fromNano } from '@ton/core';
import {CounterContract, CounterContractConfig} from '../wrappers/CounterContract';
import '@ton/test-utils';
import {balanceSpentAvg, checkContract, createContract, getAnnualSpendings, getBalance} from "./utils";
import {Blockchain, SandboxContract} from "@ton/sandbox";

describe('CounterContract', () => {

    let blockchain:Blockchain;
    let contract_v1:SandboxContract<CounterContract>;
    let contract_v2:SandboxContract<CounterContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        const cfg:CounterContractConfig = {
            counter_1_initial_value: 0,
            counter_2_initial_value: 10,
            counter_3_initial_value: 20
        };
        contract_v1 = await createContract(blockchain, "CounterContract", cfg);
        contract_v2 = await createContract(blockchain, "CounterContract_V2", cfg);
    });

    it('should all contracts work correct', async () => {
        await checkContract(contract_v1, blockchain);
        await checkContract(contract_v2, blockchain);
    });



    it('should improve spendings', async () => {
        const v1_spendings = await getAnnualSpendings(contract_v1, blockchain)
        const v2_spendings = await getAnnualSpendings(contract_v2, blockchain)
        console.log(`Contract V2 spends ${fromNano(v1_spendings - v2_spendings)} TONs less than contract V1 annually`);
    });
});