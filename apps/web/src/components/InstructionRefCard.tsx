import { useState } from "react";

type Instruction = {
  syntax: string;
  description: string;
};

type Category = {
  title: string;
  instructions: Instruction[];
};

const CATEGORIES: Category[] = [
  {
    title: "Data Movement",
    instructions: [
      { syntax: "MOV Rd, #n", description: "Load immediate value n into Rd" },
      { syntax: "MOV Rd, Rn", description: "Copy value of Rn into Rd" },
    ],
  },
  {
    title: "Arithmetic",
    instructions: [
      { syntax: "ADD Rd, Rn, Rm", description: "Rd = Rn + Rm" },
      { syntax: "ADD Rd, Rn, #n", description: "Rd = Rn + n" },
      { syntax: "SUB Rd, Rn, Rm", description: "Rd = Rn − Rm" },
      { syntax: "SUB Rd, Rn, #n", description: "Rd = Rn − n" },
      { syntax: "SUBS Rd, Rn, #n", description: "Rd = Rn − n, update flags" },
      { syntax: "MUL Rd, Rn, Rm", description: "Rd = Rn × Rm" },
    ],
  },
  {
    title: "Bitwise",
    instructions: [
      { syntax: "AND Rd, Rn, Rm", description: "Rd = Rn & Rm (clear bits)" },
      { syntax: "ORR Rd, Rn, Rm", description: "Rd = Rn | Rm (set bits)" },
      { syntax: "EOR Rd, Rn, Rm", description: "Rd = Rn ^ Rm (toggle bits)" },
    ],
  },
  {
    title: "Shifts",
    instructions: [
      { syntax: "LSL Rd, Rn, #n", description: "Rd = Rn << n (multiply by 2ⁿ)" },
      { syntax: "LSR Rd, Rn, #n", description: "Rd = Rn >> n (divide by 2ⁿ)" },
    ],
  },
  {
    title: "Compare",
    instructions: [
      { syntax: "CMP Rn, Rm", description: "Set flags from Rn − Rm (result discarded)" },
      { syntax: "CMP Rn, #n", description: "Set flags from Rn − n" },
    ],
  },
  {
    title: "Branch",
    instructions: [
      { syntax: "B label",   description: "Unconditional jump" },
      { syntax: "BEQ label", description: "Jump if Z=1 (equal)" },
      { syntax: "BNE label", description: "Jump if Z=0 (not equal)" },
      { syntax: "BGT label", description: "Jump if Z=0 and N=V (greater than)" },
      { syntax: "BLT label", description: "Jump if N≠V (less than)" },
      { syntax: "BGE label", description: "Jump if N=V (≥)" },
      { syntax: "BLE label", description: "Jump if Z=1 or N≠V (≤)" },
      { syntax: "BL label",  description: "Call: jump and save return address in LR" },
      { syntax: "BX LR",    description: "Return: jump to address in LR" },
    ],
  },
  {
    title: "Memory",
    instructions: [
      { syntax: "LDR Rd, [Rn]",       description: "Rd = Memory[Rn]" },
      { syntax: "LDR Rd, [Rn, #off]", description: "Rd = Memory[Rn + off]" },
      { syntax: "LDR Rd, [Rn], #off", description: "Rd = Memory[Rn], then Rn += off" },
      { syntax: "LDR Rd, [Rn, #off]!", description: "Rd = Memory[Rn + off], Rn updated" },
      { syntax: "STR Rd, [Rn]",       description: "Memory[Rn] = Rd (and variants as above)" },
    ],
  },
  {
    title: "Stack/Function",
    instructions: [
      { syntax: "PUSH {Rx}", description: "SP -= 4; Memory[SP] = Rx" },
      { syntax: "POP {Rx}",  description: "Rx = Memory[SP]; SP += 4" },
    ],
  },
];

export function InstructionRefCard() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="ref-card">
      <button
        className="ref-card-toggle"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
      >
        {expanded ? "Hide Reference" : "Reference"}
      </button>

      {expanded && (
        <div className="ref-card-body">
          {CATEGORIES.map((category) => (
            <section key={category.title}>
              <div className="ref-section-title">{category.title}</div>
              <table className="ref-table">
                <tbody>
                  {category.instructions.map((instr) => (
                    <tr key={instr.syntax}>
                      <td className="ref-syntax">{instr.syntax}</td>
                      <td className="ref-desc">{instr.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
