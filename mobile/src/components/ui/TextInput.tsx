import { forwardRef } from "react";
import type { TextInputProps } from "react-native";

import { Input, InputField } from "./input";

export const TextInput = forwardRef<React.ElementRef<typeof InputField>, TextInputProps>(function GluestackTextInput({ style, ...props }, ref) {
  return <Input style={style} className="min-h-12 rounded-xl border-[#DFE4EC] bg-white px-3"><InputField ref={ref} {...props} className={props.multiline ? "min-h-28 py-3" : "py-3"} /></Input>;
});

TextInput.displayName = "TextInput";
