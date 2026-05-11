import re
import os
import urllib.request
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

def process_file(filepath, prefix=''):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find all image URLs from unsplash
    urls = re.findall(r'src="(https://images\.unsplash\.com/[^"]+)"', content)
    
    os.makedirs('Img', exist_ok=True)
    
    for i, url in enumerate(set(urls)):
        clean_name = re.search(r'photo-([a-zA-Z0-9\-]+)', url)
        if clean_name:
            filename = clean_name.group(1) + ".jpg"
        else:
            filename = f"image_{i}.jpg"
            
        save_path = os.path.join('Img', filename)
        
        if not os.path.exists(save_path):
            print(f"Downloading {filename}...")
            try:
                urllib.request.urlretrieve(url, save_path)
            except Exception as e:
                print(f"Failed to download {url}: {e}")
        
        new_src = f"{prefix}Img/{filename}"
        content = content.replace(url, new_src)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Processing index.html...")
process_file('index.html', './')
print("Processing Tugaraklar.html...")
process_file('Pages/Tugaraklar.html', '../')
print("All done!")
