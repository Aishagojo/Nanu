from pathlib import Path
path = Path('frontend/src/screens/feature/SearchScreen.tsx')
text = path.read_text(encoding='utf-8')
text = text.replace('  if (resources) {\n      return resources;\n    }\n    try {', '    try {')
text = text.replace('      return [];\n    } finally {', '      return resources or [];\n    } finally {')
