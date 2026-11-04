import { Component, type ReactNode } from "react";
import { ErrorState, Screen } from "./index";
import { t } from "@/src/lib/i18n";
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    return this.state.error ? (
      <Screen title={t("error")}>
        <ErrorState
          message={this.state.error.message}
          retry={() => this.setState({ error: null })}
        />
      </Screen>
    ) : (
      this.props.children
    );
  }
}
