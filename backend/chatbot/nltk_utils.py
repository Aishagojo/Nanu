try:
    from nltk.stem import PorterStemmer
    from nltk.tokenize import word_tokenize
except Exception:  # pragma: no cover
    PorterStemmer = None
    word_tokenize = None


def normalize_text(text: str) -> list[str]:
    if not text:
        return []
    if PorterStemmer is None or word_tokenize is None:
        return text.lower().split()
    stemmer = PorterStemmer()
    tokens = word_tokenize(text.lower())
    return [stemmer.stem(t) for t in tokens]

