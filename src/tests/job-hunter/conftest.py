"""Adds the job-hunter sources directory to sys.path for test imports."""
import os
import sys

sys.path.insert(
    0,
    os.path.join(
        os.path.dirname(__file__),
        '..', '..', 'job-hunter', 'sources',
    ),
)
