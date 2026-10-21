"""
Turning the margin (the learner's cluster points minus a programme's cut-off) into a band.

Classic bands use a fixed width of 2 points. Flexible bands use a width taken from the programme's own history,
because cut-offs move very differently: most top programmes barely change while low cut-off programmes can rise
several points in a year (see docs/reference/README.md and the backtest in docs/DEVLOG.md).
"""
BAND_ORDER = ['best_fit', 'safe', 'stretch', 'excluded']

CLASSIC_WIDTH = 2.0
MIN_WIDTH = 1.0
MAX_WIDTH = 5.0
WIDTH_FACTOR = 1.5
MIN_CHANGES = 2  # yearly changes needed before a programme's own history is trusted


def classify(margin, width=CLASSIC_WIDTH):
    """safe: margin >= width; best fit: 0 <= margin < width; stretch: -width <= margin < 0; else excluded."""
    if margin >= width:
        return 'safe'
    if margin >= 0:
        return 'best_fit'
    if margin >= -width:
        return 'stretch'
    return 'excluded'


def flexible_width(history):
    """
    The band width for a programme from its cut-offs in year order: 1.5 times the mean absolute change from
    one year to the next, kept between 1 and 5 points. Fewer than two changes means the classic width.
    """
    changes = [abs(b - a) for a, b in zip(history, history[1:])]
    if len(changes) < MIN_CHANGES:
        return CLASSIC_WIDTH
    return round(min(MAX_WIDTH, max(MIN_WIDTH, WIDTH_FACTOR * sum(changes) / len(changes))), 2)
