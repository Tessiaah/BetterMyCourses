export function assistButton(label: string, asset?: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  if (asset) {
    if (!label) button.classList.add('bmc-assist-icon-only');
    const icon = document.createElement('span');
    icon.setAttribute('aria-hidden', 'true');
    // Trusted locally bundled Phosphor SVG assets only.
    icon.innerHTML = asset;
    button.append(icon);
  }
  button.append(document.createTextNode(label));
  return button;
}
