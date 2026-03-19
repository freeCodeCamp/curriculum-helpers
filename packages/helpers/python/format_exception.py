# Exception formatting functions for Python error messages


def drop_until(*, traces, filename):
    from itertools import dropwhile

    return list(
        dropwhile(lambda line: not line.startswith(f'  File "{filename}"'), traces)
    )


def build_message(*, traces, exception_list):
    return "".join(["Traceback (most recent call last):\n"] + traces + exception_list)


def _replace_startswith(string, old, new):
    if string.startswith(old):
        return new + string[len(old) :]
    return string


def format_exception(*, exception, traceback, filename, new_filename=None):
    if new_filename is None:
        new_filename = filename
    from traceback import format_exception_only, format_tb

    # The trace up to "filename" are the frames that are not part of the user's
    # code so we drop them.
    traces = drop_until(traces=format_tb(traceback), filename=filename)
    renamed_traces = [
        _replace_startswith(trace, f'  File "{filename}"', f'  File "{new_filename}"')
        for trace in traces
    ]
    renamed_exception = [
        _replace_startswith(e, f'  File "{filename}"', f'  File "{new_filename}"')
        for e in format_exception_only(exception)
    ]
    return build_message(traces=renamed_traces, exception_list=renamed_exception)
