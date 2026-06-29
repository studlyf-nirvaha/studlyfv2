#!/bin/bash

# Ensure scripts/check_errors.py is executable
chmod +x "$(dirname "$0")/scripts/check_errors.py"

# Run the python diagnostic script
python3 "$(dirname "$0")/scripts/check_errors.py"
