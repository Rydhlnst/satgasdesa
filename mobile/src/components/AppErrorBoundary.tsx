import { Component, type ErrorInfo, type ReactNode } from "react";
import { Text, View } from "react-native";

import { Button, ButtonText } from "./ui/button";
import { colors, spacing, typography } from "../theme";
import { createClientId } from "../lib/id";

type Props = { children: ReactNode };
type State = { hasError: boolean; errorCode?: string };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true, errorCode: createClientId().slice(0, 8).toUpperCase() };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) console.error("Mobile render error", error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, errorCode: undefined });

  render() {
    if (!this.state.hasError) return this.props.children;
    return <View style={{ alignItems: "center", backgroundColor: colors.page, flex: 1, gap: spacing.md, justifyContent: "center", padding: spacing.xl }}><Text style={{ color: colors.danger, fontSize: typography.section, fontWeight: "900", textAlign: "center" }}>Halaman mengalami masalah</Text><Text style={{ color: colors.textMuted, fontSize: typography.body, textAlign: "center" }}>Coba muat ulang halaman ini. Jika berulang, kirim kode error lokal berikut kepada pengelola aplikasi.</Text>{this.state.errorCode ? <Text style={{ color: colors.textSubtle, fontSize: typography.caption, textAlign: "center" }}>Kode error lokal: {this.state.errorCode}</Text> : null}<Button onPress={this.reset} className="min-h-12 rounded-xl bg-[#1454C4] px-5"><ButtonText>Coba lagi</ButtonText></Button></View>;
  }
}
