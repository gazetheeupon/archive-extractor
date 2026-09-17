import { Archive } from './libarchive.js';

Archive.init({ workerUrl: 'worker-bundle.js' });

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const status = document.getElementById('status');
const extractList = document.getElementById('extractList');
const downloadAllBtn = document.getElementById('downloadAllBtn');

let extractResults = [];

function flatten(obj, prefix) {
  prefix = prefix || '';
  let out = [];
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (value instanceof File) {
      out.push({ path: prefix + key, file: value });
    } else if (value && typeof value === 'object') {
      out = out.concat(flatten(value, prefix + key + '/'));
    }
  }
  return out;
}

async function handleFile(file) {
  if (!file) return;
  extractList.innerHTML = '';
  extractResults = [];
  downloadAllBtn.style.display = 'none';
  status.textContent = 'Opening ' + file.name + '...';
  try {
    const archive = await Archive.open(file);

    const encrypted = await archive.hasEncryptedData().catch(() => null);
    if (encrypted) {
      status.textContent = 'This archive is password-protected. Password-protected archives are not supported yet.';
      return;
    }

    status.textContent = 'Extracting...';
    const tree = await archive.extractFiles();
    const flat = flatten(tree);

    if (flat.length === 0) {
      status.textContent = 'No files found in this archive (or the format is not supported).';
      return;
    }

    for (const entry of flat) {
      const url = URL.createObjectURL(entry.file);
      extractResults.push({ name: entry.path, url });
      const li = document.createElement('li');
      li.innerHTML = '<span>' + entry.path + '</span><a class="dl" download="' + entry.path.split('/').pop() + '" href="' + url + '">Download</a>';
      extractList.appendChild(li);
    }
    status.textContent = 'Done. ' + flat.length + ' file(s) found.';
    downloadAllBtn.style.display = flat.length > 1 ? 'inline-block' : 'none';
  } catch (err) {
    status.textContent = 'Error: ' + err.message + ' (is this a supported archive format?)';
    console.error(err);
  }
}

dropzone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
['dragenter', 'dragover'].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => {
    e.preventDefault();
    dropzone.classList.add('drag');
  })
);
['dragleave', 'drop'].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag');
  })
);
dropzone.addEventListener('drop', (e) => handleFile(e.dataTransfer.files[0]));

downloadAllBtn.addEventListener('click', () => {
  extractResults.forEach((r, i) => {
    setTimeout(() => {
      const a = document.createElement('a');
      a.href = r.url;
      a.download = r.name.split('/').pop();
      a.click();
    }, i * 200);
  });
});
