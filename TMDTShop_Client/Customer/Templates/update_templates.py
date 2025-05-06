import os
import re

def update_template(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract main content
    main_content = re.search(r'<main.*?>(.*?)</main>', content, re.DOTALL)
    if not main_content:
        return False

    # Extract title
    title_match = re.search(r'<title>(.*?)</title>', content)
    title = title_match.group(1) if title_match else 'ShopX - Thương mại điện tử'

    # Extract extra CSS and JS
    extra_css = re.search(r'<link.*?href="(?!https?://).*?\.css".*?>', content)
    extra_js = re.search(r'<script.*?src="(?!https?://).*?\.js".*?>', content)

    # Create new template content
    new_content = f'''{{% extends "base.html" %}}

{{% block title %}}{title}{{% endblock %}}

{{% block extra_css %}}
{extra_css.group(0) if extra_css else ''}
{{% endblock %}}

{{% block content %}}
{main_content.group(1)}
{{% endblock %}}

{{% block extra_js %}}
{extra_js.group(0) if extra_js else ''}
{{% endblock %}}
'''

    # Write updated content
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

    return True

def main():
    templates_dir = os.path.dirname(os.path.abspath(__file__))
    excluded_files = {'login.html', 'base.html', 'header.html', 'footer.html', 'cms_components.html', 'cms_config.json'}

    for filename in os.listdir(templates_dir):
        if filename.endswith('.html') and filename not in excluded_files:
            file_path = os.path.join(templates_dir, filename)
            if update_template(file_path):
                print(f'Updated {filename}')
            else:
                print(f'Failed to update {filename}')

if __name__ == '__main__':
    main() 