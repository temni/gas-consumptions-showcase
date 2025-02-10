const `op::increase` = "op::increase"c;
const `op::flush` = "op::flush"c;

const M = (1 << 32) - 1;

// load_data populates storage variables using stored data
@inline
fun loadData(): int {
    var ds = getContractData().beginParse();
    return ds.loadUint(192);
}

// save_data stores storage variables as a cell into persistent storage
@inline
fun saveCounters(composite: int) {
    setContractData(beginCell().storeUint(composite, 192).endCell());
}

fun onInternalMessage(inMsgFull: cell, inMsgBody: slice) {
    if (inMsgBody.isEndOfSlice()) { // ignore all empty messages
        return;
    }

    var cs: slice = inMsgFull.beginParse();
    var flags: int = cs.loadUint(4);
    if (flags & 1) { // ignore all bounced messages
        return;
    }
    var senderAddress: slice = cs.loadAddress();
    var op: int = inMsgBody.loadUint(32);
    inMsgBody.skipBits(64);

    if (op == `op::increase`) {
        var (counterNumber, increaseBy)  = (inMsgBody.loadUint(32), inMsgBody.loadUint(32));
        var pos: int = (6 - counterNumber) * 32;
        var composite: int = loadData();
        var X: int = (composite >> pos) & M;
        saveCounters(composite - (X << pos) + (((X + increaseBy) & M) << pos));

        // return unspent grams back
        sendRawMessage(beginCell()
            .storeUint(0x18, 6)
            .storeSlice(senderAddress)
            .storeCoins(0)
            .storeUint(0, 107)
            .endCell(),
            64);

        return;
    }

    if (op == `op::flush`) {
        var counterNumber: int = inMsgBody.loadUint(32);

        var pos: int = (6 - counterNumber) * 32;
        var composite: int = loadData();
        var X: int = (composite >> pos) & M;
        var newField: int = ((composite >> ((3 - counterNumber) * 32)) & M) & M;
        saveCounters(composite - (X << pos) + (newField << pos));

        // return unspent grams back
        sendRawMessage(beginCell()
            .storeUint(0x18, 6)
            .storeSlice(senderAddress)
            .storeCoins(0)
            .storeUint(0, 107)
            .endCell(),
            64);

        return;
    }

    throw 0xffff;
}

get get_counters(): (int, int, int) {
    var composite: int = loadData();
    return (composite >> 160, (composite >> 128) & ((1 << 32) - 1), (composite >> 96) & ((1 << 32) - 1));
}
