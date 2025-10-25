import threading
from typing import Any, Dict, Optional

_state = threading.local()


def set_user(user):
    _state.user = user


def get_user():
    return getattr(_state, "user", None)


def set_request_info(info: Dict[str, Any]):
    _state.request_info = info


def get_request_info() -> Optional[Dict[str, Any]]:
    return getattr(_state, "request_info", None)


def clear():
    for attr in ("user", "request_info"):
        if hasattr(_state, attr):
            delattr(_state, attr)
