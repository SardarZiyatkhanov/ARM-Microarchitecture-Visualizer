// ─────────────────────────────────────────────────────────────────────────────
// Virtual Memory & TLB Simulation for ARM Microarchitecture Visualizer
// ─────────────────────────────────────────────────────────────────────────────
//
// Design choices:
//   • Page size  : 4 KB  (12-bit offset, matches real ARM)
//   • TLB size   : 16 entries  (direct-mapped, fully-associative for simplicity)
//   • VPN        : upper bits of virtual address  (addr >> 12)
//   • PFN        : physical frame number (simulated, offset by 0x1000 per frame)
//   • Replacement: LRU (we track `lastUsed` clock tick)
// ─────────────────────────────────────────────────────────────────────────────

export const PAGE_SIZE  = 4096;          // 4 KB
export const TLB_SIZE   = 16;            // number of TLB entries
export const PAGE_OFFSET_BITS = 12;      // log2(PAGE_SIZE)

// ── Types ────────────────────────────────────────────────────────────────────

export interface TLBEntry {
    valid:    boolean;
    vpn:      number;   // Virtual Page Number
    pfn:      number;   // Physical Frame Number
    dirty:    boolean;  // has this page been written to?
    lastUsed: number;   // clock tick — used for LRU eviction
}

export interface PageTableEntry {
    vpn:     number;
    pfn:     number;
    present: boolean;
}

export interface MemoryAccessResult {
    virtualAddress:  number;
    physicalAddress: number;
    vpn:             number;
    pfn:             number;
    pageOffset:      number;
    hit:             boolean;   // true = TLB hit, false = TLB miss
    evictedVpn:      number | null; // which VPN was evicted on a miss (-1 = none)
}

export interface TLBState {
    entries:    TLBEntry[];
    pageTable:  Record<number, PageTableEntry>; // vpn → page table entry
    accessLog:  MemoryAccessResult[];
    hitCount:   number;
    missCount:  number;
}

// ── Initialise ───────────────────────────────────────────────────────────────

export const createEmptyTLB = (): TLBState => ({
    entries: Array.from({ length: TLB_SIZE }, (_, i) => ({
        valid:    false,
        vpn:      0,
        pfn:      i,      // pre-assign unique PFNs for display clarity
        dirty:    false,
        lastUsed: 0,
    })),
    pageTable:  {},
    accessLog:  [],
    hitCount:   0,
    missCount:  0,
});

// ── Core translation logic ────────────────────────────────────────────────────

/**
 * Translate a virtual address through the TLB.
 * Returns the updated TLBState AND the access result.
 */
export const translateAddress = (
    virtualAddress: number,
    isWrite:        boolean,
    clock:          number,
    tlbState:       TLBState
): { newTlbState: TLBState; result: MemoryAccessResult } => {
    const vpn        = virtualAddress >>> PAGE_OFFSET_BITS;
    const pageOffset = virtualAddress & (PAGE_SIZE - 1);

    const entries   = tlbState.entries.map(e => ({ ...e }));
    const pageTable = { ...tlbState.pageTable };

    // ── TLB lookup ────────────────────────────────────────────────────────────
    const hitIdx = entries.findIndex(e => e.valid && e.vpn === vpn);

    if (hitIdx !== -1) {
        // ✅ TLB Hit
        entries[hitIdx].lastUsed = clock;
        if (isWrite) entries[hitIdx].dirty = true;

        const pfn             = entries[hitIdx].pfn;
        const physicalAddress = (pfn << PAGE_OFFSET_BITS) | pageOffset;

        const result: MemoryAccessResult = {
            virtualAddress, physicalAddress, vpn, pfn, pageOffset,
            hit: true, evictedVpn: null,
        };

        return {
            result,
            newTlbState: {
                ...tlbState,
                entries,
                pageTable,
                accessLog:  [...tlbState.accessLog.slice(-19), result],
                hitCount:   tlbState.hitCount + 1,
                missCount:  tlbState.missCount,
            },
        };
    }

    // ❌ TLB Miss — walk page table
    let pfn: number;
    let existingPTE = pageTable[vpn];

    if (existingPTE) {
        pfn = existingPTE.pfn;
    } else {
        // Allocate a new physical frame (simple sequential allocator)
        const usedPfns = new Set(Object.values(pageTable).map(pte => pte.pfn));
        pfn = 0;
        while (usedPfns.has(pfn)) pfn++;
        pageTable[vpn] = { vpn, pfn, present: true };
    }

    // Find LRU slot to evict
    const lruIdx = entries.reduce((minIdx, e, i, arr) =>
        (!arr[minIdx].valid) ? minIdx :
        (!e.valid || e.lastUsed < arr[minIdx].lastUsed) ? i : minIdx,
        0
    );

    const evictedVpn = entries[lruIdx].valid ? entries[lruIdx].vpn : null;

    // Install new entry
    entries[lruIdx] = { valid: true, vpn, pfn, dirty: isWrite, lastUsed: clock };

    const physicalAddress = (pfn << PAGE_OFFSET_BITS) | pageOffset;

    const result: MemoryAccessResult = {
        virtualAddress, physicalAddress, vpn, pfn, pageOffset,
        hit: false, evictedVpn,
    };

    return {
        result,
        newTlbState: {
            ...tlbState,
            entries,
            pageTable,
            accessLog:  [...tlbState.accessLog.slice(-19), result],
            hitCount:   tlbState.hitCount,
            missCount:  tlbState.missCount + 1,
        },
    };
};
