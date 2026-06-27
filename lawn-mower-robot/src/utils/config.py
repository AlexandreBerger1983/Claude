import os
from pathlib import Path
import yaml


_CONFIG_PATH = Path(__file__).parent.parent.parent / "config" / "robot.yaml"


def load_config(path: str | None = None) -> dict:
    config_file = Path(path) if path else _CONFIG_PATH
    if not config_file.exists():
        example = config_file.parent / "robot.example.yaml"
        if example.exists():
            config_file = example
        else:
            raise FileNotFoundError(f"Config file not found: {config_file}")
    with open(config_file) as f:
        return yaml.safe_load(f)


_config: dict | None = None


def get_config() -> dict:
    global _config
    if _config is None:
        _config = load_config(os.environ.get("ROBOT_CONFIG"))
    return _config
