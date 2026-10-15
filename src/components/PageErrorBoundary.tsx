import { Component, type ReactNode } from 'react';
import { ErrorState } from '@/components/ui';

interface Props {
  resetKey?: string;
  children: ReactNode;
}

interface State {
  error: boolean;
}

/** Keeps a render crash on one page from leaving the rest of the app blank. */
export class PageErrorBoundary extends Component<Props, State> {
  state: State = { error: false };

  static getDerivedStateFromError(): State {
    return { error: true };
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: false });
  }

  render() {
    if (this.state.error) {
      return <ErrorState message="This page could not be shown." onRetry={() => this.setState({ error: false })} />;
    }
    return this.props.children;
  }
}
