import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const nativeFormSource = readFileSync(resolve(process.cwd(), "mobile/src/components/NativeForm.tsx"), "utf8");

describe("NativeForm rendering contracts", () => {
  it("does not call useWatch for register-only fields", () => {
    const fieldStart = nativeFormSource.indexOf("function RHFInputField");
    const uncontrolledStart = nativeFormSource.indexOf("function UncontrolledRHFInputField");
    const controlledStart = nativeFormSource.indexOf("function ControlledRHFInputField");
    const fieldRouter = nativeFormSource.slice(fieldStart, uncontrolledStart);
    const uncontrolledField = nativeFormSource.slice(uncontrolledStart, controlledStart);
    const controlledField = nativeFormSource.slice(controlledStart);

    expect(fieldRouter).toContain("return props.control ? <ControlledRHFInputField");
    expect(uncontrolledField).not.toContain("useWatch");
    expect(controlledField).toContain("useWatch({ control");
  });
});
