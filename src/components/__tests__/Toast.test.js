import { render, screen, act } from '@testing-library/react';
import Toast from '../Toast';

describe('Toast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing when toast is null', () => {
    const { container } = render(<Toast toast={null} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders toast title', () => {
    const toast = { id: '1', type: 'success', title: 'Success!' };
    render(<Toast toast={toast} onClose={() => {}} />);

    expect(screen.getByText('Success!')).toBeInTheDocument();
  });

  it('renders toast message when provided', () => {
    const toast = {
      id: '1',
      type: 'success',
      title: 'Success!',
      message: 'Operation completed',
    };
    render(<Toast toast={toast} onClose={() => {}} />);

    expect(screen.getByText('Operation completed')).toBeInTheDocument();
  });

  it('does not render message when not provided', () => {
    const toast = { id: '1', type: 'success', title: 'Success!' };
    render(<Toast toast={toast} onClose={() => {}} />);

    expect(screen.queryByText('Operation completed')).not.toBeInTheDocument();
  });

  it('calls onClose after timeout', () => {
    const onClose = jest.fn();
    const toast = { id: '123', type: 'success', title: 'Test' };

    render(<Toast toast={toast} onClose={onClose} />);

    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(3200);
    });

    expect(onClose).toHaveBeenCalledWith('123');
  });

  it('applies error styling for error type', () => {
    const toast = { id: '1', type: 'error', title: 'Error!' };
    render(<Toast toast={toast} onClose={() => {}} />);

    const titleElement = screen.getByText('Error!');
    // Error type uses colors.error (#B5594E) for text
    expect(titleElement).toHaveStyle({ color: '#B5594E' });
  });

  it('applies success styling for success type', () => {
    const toast = { id: '1', type: 'success', title: 'Success!' };
    render(<Toast toast={toast} onClose={() => {}} />);

    const titleElement = screen.getByText('Success!');
    // Success type uses colors.success (#6B8E6B) for text
    expect(titleElement).toHaveStyle({ color: '#6B8E6B' });
  });
});
