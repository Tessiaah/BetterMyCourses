import pencil from '@phosphor-icons/core/assets/regular/pencil-simple.svg?raw';
import eraser from '@phosphor-icons/core/assets/regular/eraser.svg?raw';
import hand from '@phosphor-icons/core/assets/regular/hand.svg?raw';
import undoIcon from '@phosphor-icons/core/assets/regular/arrow-counter-clockwise.svg?raw';
import trash from '@phosphor-icons/core/assets/regular/trash.svg?raw';
import x from '@phosphor-icons/core/assets/regular/x.svg?raw';

type Tool = 'pen' | 'eraser' | 'browse';
type Point = { x: number; y: number };
type Stroke = {
  tool: Exclude<Tool, 'browse'>;
  color: string;
  width: number;
  points: Point[];
};

function button(label: string, asset: string): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  const icon = document.createElement('span');
  icon.setAttribute('aria-hidden', 'true');
  // Trusted bundled Phosphor SVG, not site/user HTML.
  icon.innerHTML = asset;
  element.append(icon, document.createTextNode(label));
  return element;
}

/** One ephemeral viewport canvas. Coordinates follow the selected question. */
export function createDrawingSurface(
  anchor: HTMLElement,
  onClose: () => void,
  accent: string,
) {
  const root = document.createElement('div');
  root.className = 'bmc-drawing-surface';
  const canvas = document.createElement('canvas');
  canvas.className = 'bmc-drawing-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const context = canvas.getContext('2d');
  const panel = document.createElement('section');
  panel.className = 'bmc-drawing-tools';
  panel.setAttribute('aria-label', 'Drawing tools');
  const header = document.createElement('div');
  header.className = 'bmc-drawing-header';
  const heading = document.createElement('h2');
  heading.textContent = 'Draw on this page';
  const close = button('Close', x);
  close.title = 'Close and clear drawings (Escape)';
  close.addEventListener('click', onClose);
  header.append(heading, close);

  const tools = document.createElement('div');
  tools.className = 'bmc-drawing-row';
  const modes = new Map<Tool, HTMLButtonElement>();
  for (const [mode, label, icon] of [
    ['pen', 'Pen', pencil],
    ['eraser', 'Eraser', eraser],
    ['browse', 'Browse', hand],
  ] as const) {
    const control = button(label, icon);
    control.addEventListener('click', () => selectTool(mode));
    tools.append(control);
    modes.set(mode, control);
  }

  const controls = document.createElement('div');
  controls.className = 'bmc-drawing-row';
  const colorLabel = document.createElement('label');
  colorLabel.className = 'bmc-drawing-color';
  colorLabel.append(document.createTextNode('Pen color'));
  const color = document.createElement('input');
  color.type = 'color';
  color.value = /^#[\da-f]{6}$/i.test(accent) ? accent : '#d8c3a0';
  colorLabel.append(color);
  const colors = document.createElement('div');
  colors.className = 'bmc-drawing-colors';
  colors.setAttribute('role', 'group');
  colors.setAttribute('aria-label', 'Pen color presets');
  const swatches: [string, HTMLButtonElement][] = [];
  for (const [label, value] of [
    ['Accent', color.value],
    ['Ivory', '#f1efea'],
    ['Charcoal', '#202124'],
    ['Rose', '#e79598'],
    ['Sage', '#a8c7b5'],
  ]) {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.setAttribute('aria-label', label! + ' pen color');
    swatch.title = label!;
    swatch.style.setProperty('--bmc-ink', value!);
    swatch.addEventListener('click', () => {
      color.value = value!;
      selectTool('pen');
    });
    swatches.push([value!, swatch]);
    colors.append(swatch);
  }
  const widthLabel = document.createElement('label');
  widthLabel.className = 'bmc-drawing-width';
  widthLabel.append(document.createTextNode('Size'));
  const width = document.createElement('input');
  width.type = 'range';
  width.setAttribute('aria-label', 'Stroke size');
  width.min = '2';
  width.max = '16';
  width.value = '4';
  const size = document.createElement('output');
  size.textContent = '4 px';
  width.addEventListener('input', () => {
    size.textContent = width.value + ' px';
  });
  widthLabel.append(width, size);
  controls.append(colorLabel, colors, widthLabel);

  const footer = document.createElement('div');
  footer.className = 'bmc-drawing-row';
  const undo = button('Undo', undoIcon);
  const clear = button('Clear', trash);
  const status = document.createElement('p');
  status.className = 'bmc-drawing-status';
  status.setAttribute('role', 'status');
  footer.append(undo, clear, status);
  panel.append(header, tools, controls, footer);
  root.append(canvas, panel);
  document.body.append(root);

  const strokes: Stroke[] = [];
  let tool: Tool = 'pen';
  let current: Stroke | undefined;
  let pointer: number | undefined;
  let frame = 0;
  let disposed = false;
  // Bounded in-memory history; nothing is written to storage or sent anywhere.
  const maxStrokes = 300;
  const maxPoints = 40000;
  let pointCount = 0;

  function sync(): void {
    for (const [mode, control] of modes)
      control.setAttribute('aria-pressed', String(mode === tool));
    for (const [value, swatch] of swatches)
      swatch.setAttribute('aria-pressed', String(value === color.value));
    canvas.style.pointerEvents = tool === 'browse' ? 'none' : 'auto';
    canvas.style.cursor = tool === 'eraser' ? 'cell' : 'crosshair';
    undo.disabled = clear.disabled = strokes.length === 0;
    status.textContent =
      tool === 'browse'
        ? 'Browse the page. Closing clears ink.'
        : tool === 'eraser'
          ? 'Erase ink. Closing clears it.'
          : 'Draw anywhere. Closing clears ink.';
  }

  function finish(): void {
    if (pointer !== undefined && canvas.hasPointerCapture(pointer))
      canvas.releasePointerCapture(pointer);
    pointer = undefined;
    current = undefined;
  }

  function selectTool(next: Tool): void {
    finish();
    tool = next;
    sync();
  }
  color.addEventListener('input', () => selectTool('pen'));
  undo.addEventListener('click', () => {
    finish();
    const removed = strokes.pop();
    pointCount -= removed?.points.length ?? 0;
    sync();
    schedule();
  });
  clear.addEventListener('click', () => {
    finish();
    strokes.length = pointCount = 0;
    sync();
    schedule();
  });

  function position(event: PointerEvent): Point {
    const rect = anchor.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  canvas.addEventListener('pointerdown', (event) => {
    if (
      !context ||
      tool === 'browse' ||
      !event.isPrimary ||
      event.button !== 0 ||
      pointer !== undefined
    )
      return;
    if (strokes.length >= maxStrokes || pointCount >= maxPoints) {
      status.textContent = 'Drawing is full. Undo or clear to keep drawing.';
      return;
    }
    event.preventDefault();
    pointer = event.pointerId;
    canvas.setPointerCapture(pointer);
    current = {
      tool,
      color: color.value,
      width: Number(width.value) * (tool === 'eraser' ? 4 : 1),
      points: [position(event)],
    };
    strokes.push(current);
    pointCount++;
    sync();
    schedule();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (pointer !== event.pointerId || !current || pointCount >= maxPoints)
      return;
    const next = position(event);
    const previous = current.points.at(-1)!;
    if (Math.hypot(next.x - previous.x, next.y - previous.y) < 0.5) return;
    current.points.push(next);
    pointCount++;
    schedule();
  });
  canvas.addEventListener('pointerup', (event) => {
    if (event.pointerId === pointer) finish();
  });
  for (const eventName of ['pointercancel', 'lostpointercapture'])
    canvas.addEventListener(eventName, (event) => {
      if ((event as PointerEvent).pointerId === pointer) finish();
    });

  function paint(): void {
    frame = 0;
    if (disposed || !context) return;
    if (!anchor.isConnected) {
      onClose();
      return;
    }
    const viewport = window.visualViewport;
    const viewWidth = viewport?.width ?? innerWidth;
    const viewHeight = viewport?.height ?? innerHeight;
    root.style.width = viewWidth + 'px';
    root.style.height = viewHeight + 'px';
    root.style.left = (viewport?.offsetLeft ?? 0) + 'px';
    root.style.top = (viewport?.offsetTop ?? 0) + 'px';
    const scale = Math.min(
      devicePixelRatio || 1,
      2,
      4096 / viewWidth,
      4096 / viewHeight,
    );
    const w = Math.max(1, Math.round(viewWidth * scale));
    const h = Math.max(1, Math.round(viewHeight * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.clearRect(0, 0, viewWidth, viewHeight);
    const rect = anchor.getBoundingClientRect();
    const surfaceRect = root.getBoundingClientRect();
    context.translate(rect.left - surfaceRect.left, rect.top - surfaceRect.top);
    context.lineCap = context.lineJoin = 'round';
    for (const stroke of strokes) {
      context.globalCompositeOperation =
        stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
      context.strokeStyle = context.fillStyle = stroke.color;
      context.lineWidth = stroke.width;
      const first = stroke.points[0]!;
      context.beginPath();
      if (stroke.points.length === 1) {
        context.arc(first.x, first.y, stroke.width / 2, 0, Math.PI * 2);
        context.fill();
      } else {
        context.moveTo(first.x, first.y);
        for (const point of stroke.points.slice(1))
          context.lineTo(point.x, point.y);
        context.stroke();
      }
    }
    context.globalCompositeOperation = 'source-over';
  }
  function schedule(): void {
    if (!frame && !disposed) frame = requestAnimationFrame(paint);
  }
  function keydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && !event.defaultPrevented) {
      event.preventDefault();
      onClose();
    }
  }
  // Capturing scroll catches Moodle's nested scrolling page/drawers too.
  document.addEventListener('scroll', schedule, {
    capture: true,
    passive: true,
  });
  window.addEventListener('resize', schedule, { passive: true });
  window.visualViewport?.addEventListener('resize', schedule, {
    passive: true,
  });
  window.visualViewport?.addEventListener('scroll', schedule, {
    passive: true,
  });
  document.addEventListener('keydown', keydown);
  window.addEventListener('pagehide', onClose);
  const resize = new ResizeObserver(schedule);
  resize.observe(anchor);
  sync();
  schedule();
  modes.get('pen')!.focus({ preventScroll: true });
  if (!context) {
    selectTool('browse');
    status.textContent =
      'Drawing is unavailable in this browser. Close to return to the page.';
  }

  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      finish();
      cancelAnimationFrame(frame);
      resize.disconnect();
      document.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('scroll', schedule);
      document.removeEventListener('keydown', keydown);
      window.removeEventListener('pagehide', onClose);
      strokes.length = 0;
      canvas.width = canvas.height = 0;
      root.remove();
    },
  };
}
