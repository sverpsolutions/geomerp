import markdown

with open(r'C:\Users\Administrator\.gemini\antigravity\brain\e46c9028-2d26-444a-940a-2ced1fdd3abc\artifacts\api_documentation.md', 'r', encoding='utf-8') as f:
    text = f.read()

html_content = markdown.markdown(text)

full_html = f'''
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>API Documentation</title>
<style>
  body {{ font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; color: #333; }}
  h1, h2, h3 {{ color: #222; border-bottom: 1px solid #ddd; padding-bottom: 5px; }}
  pre {{ background: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; }}
  code {{ font-family: Consolas, monospace; background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }}
  blockquote {{ border-left: 4px solid #ccc; margin: 0; padding-left: 10px; color: #666; }}
</style>
</head>
<body>
{html_content}
</body>
</html>
'''

with open(r'C:\xampp\htdocs\ModernBazaarHO\api_documentation.html', 'w', encoding='utf-8') as f:
    f.write(full_html)
