import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, info) {
    console.error(error, info);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-orange-50 px-6 text-center">
          <div className="text-6xl">😵</div>
          <h2 className="mt-4 text-2xl font-bold text-orange-600">
            Oops! Something went wrong
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            {this.state.error?.message}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-4 min-w-[160px] rounded-2xl bg-orange-500 px-6 py-3 text-lg font-bold text-white"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}