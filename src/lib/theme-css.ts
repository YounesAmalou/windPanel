import {
  DEFAULT_MODE_ID,
  THEME_VARIABLES,
  collectVariablesFromModes,
  createDefaultMode,
  createModeId,
  cssVariableName,
  modeLabelFromId,
  normalizeVariableName,
  uniqueModeId,
  type ThemeActivation,
  type ThemeDocument,
  type ThemeModeDefinition,
  type ThemeValues,
} from './theme';

export type ThemeParseError = {
  message: string;
  snippet: string;
  line: number;
  column: number;
};

export type ThemeParseResult = {
  document: ThemeDocument;
  errors: ThemeParseError[];
};

type ParsedBlock = {
  selector: string;
  body: string;
  start: number;
  bodyStart: number;
};

type SelectorInfo = {
  id: string;
  label: string;
  selector: string;
  activation?: ThemeActivation;
};

export function serializeThemeDocument(document: ThemeDocument, modeId?: string): string {
  const variables = document.variables.length > 0 ? document.variables : [...THEME_VARIABLES];
  const modes = modeId ? document.modes.filter((mode) => mode.id === modeId) : document.modes;

  return modes
    .map((mode) => {
      const declarations = variables
        .map((variable) => {
          const value = mode.values[variable]?.trim();
          return value ? `  ${cssVariableName(variable)}: ${value};` : '';
        })
        .filter(Boolean)
        .join('\n');

      return `${mode.selector || ':root'} {\n${declarations}\n}`;
    })
    .join('\n\n');
}

export function parseThemeCss(input: string): ThemeParseResult {
  const errors: ThemeParseError[] = [];
  const blocks = collectBlocks(input, errors);
  const existingIds = new Set<string>();
  const modes: ThemeModeDefinition[] = [];

  for (const block of blocks) {
    if (block.selector.startsWith('@')) {
      continue;
    }

    const values = parseDeclarations(input, block, errors);
    if (Object.keys(values).length === 0) continue;

    const selectorInfo = inferSelectorInfo(block.selector, existingIds);
    existingIds.add(selectorInfo.id);
    modes.push({
      id: selectorInfo.id,
      label: selectorInfo.label,
      selector: selectorInfo.selector,
      activation: selectorInfo.activation,
      values,
      source: 'user',
    });
  }

  const normalizedModes = modes.length > 0 ? modes : [createDefaultMode()];
  if (modes.length === 0 && input.trim().length > 0 && errors.length === 0) {
    errors.push({
      message: 'No valid theme selector blocks were found.',
      snippet: input.trim().slice(0, 160),
      line: 1,
      column: 1,
    });
  }
  const activeModeId = normalizedModes.some((mode) => mode.id === DEFAULT_MODE_ID)
    ? DEFAULT_MODE_ID
    : normalizedModes[0]?.id || DEFAULT_MODE_ID;

  return {
    document: {
      version: 1,
      variables: collectVariablesFromModes(normalizedModes),
      modes: normalizedModes,
      activeModeId,
      updatedAt: Date.now(),
    },
    errors,
  };
}

export function inferSelectorInfo(selector: string, existingIds: ReadonlySet<string> = new Set()): SelectorInfo {
  const selectors = splitSelectorList(selector);
  const preferred = selectors[0]?.trim() || ':root';
  const defaultSelector = selectors.find((item) => /^(?::root|html|body)$/i.test(item.trim()));

  if (defaultSelector) {
    return {
      id: DEFAULT_MODE_ID,
      label: 'Light',
      selector: defaultSelector.trim(),
    };
  }

  const attributeMatch = preferred.match(
    /\b(html|body)?\s*\[\s*(data-theme|data-mode|data-color-scheme|theme)\s*=\s*["']?([^"'\]\s]+)["']?\s*\]/i,
  );

  if (attributeMatch) {
    const target = (attributeMatch[1]?.toLowerCase() || 'html') as 'html' | 'body';
    const name = attributeMatch[2];
    const value = attributeMatch[3];
    const id = uniqueModeId(value, existingIds);

    return {
      id,
      label: modeLabelFromId(id),
      selector: preferred,
      activation: {
        type: 'attribute',
        target,
        name,
        value,
      },
    };
  }

  const classMatch = preferred.match(/\b(html|body)?\s*\.([_a-zA-Z]+[_a-zA-Z0-9-]*)/);

  if (classMatch) {
    const target = (classMatch[1]?.toLowerCase() || 'html') as 'html' | 'body';
    const value = classMatch[2];
    const id = uniqueModeId(value, existingIds);

    return {
      id,
      label: modeLabelFromId(id),
      selector: preferred,
      activation: {
        type: 'class',
        target,
        value,
      },
    };
  }

  const id = uniqueModeId(createModeId(preferred), existingIds);

  return {
    id,
    label: modeLabelFromId(id),
    selector: preferred,
    activation: {
      type: 'selector',
      selector: preferred,
    },
  };
}

export function splitSelectorList(selector: string): string[] {
  const selectors: string[] = [];
  let depth = 0;
  let quote: string | undefined;
  let start = 0;

  for (let index = 0; index < selector.length; index += 1) {
    const char = selector[index];

    if (quote) {
      if (char === quote && selector[index - 1] !== '\\') quote = undefined;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === '(' || char === '[') depth += 1;
    if (char === ')' || char === ']') depth = Math.max(0, depth - 1);

    if (char === ',' && depth === 0) {
      selectors.push(selector.slice(start, index).trim());
      start = index + 1;
    }
  }

  selectors.push(selector.slice(start).trim());
  return selectors.filter(Boolean);
}

function collectBlocks(input: string, errors: ThemeParseError[], offset = 0): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  let cursor = 0;

  while (cursor < input.length) {
    const open = input.indexOf('{', cursor);
    if (open === -1) {
      const tail = input.slice(cursor).trim();
      if (tail) {
        errors.push(createError(input, offset + cursor, 'Theme text outside a selector block.', tail));
      }
      break;
    }

    const selector = input.slice(cursor, open).trim();
    const close = findMatchingBrace(input, open);

    if (selector.includes('}')) {
      errors.push(createError(input, offset + cursor, 'Unexpected closing brace before selector block.', selector));
    }

    if (!selector) {
      errors.push(createError(input, offset + open, 'Missing selector before block.', input.slice(open, open + 40)));
    }

    if (close === -1) {
      errors.push(createError(input, offset + open, 'Missing closing brace for selector block.', input.slice(open, open + 80)));
      break;
    }

    const body = input.slice(open + 1, close);

    if (selector.trim().startsWith('@')) {
      blocks.push(...collectBlocks(body, errors, offset + open + 1));
    } else {
      blocks.push({
        selector,
        body,
        start: offset + cursor,
        bodyStart: offset + open + 1,
      });
    }

    cursor = close + 1;
  }

  return blocks;
}

function parseDeclarations(source: string, block: ParsedBlock, errors: ThemeParseError[]): ThemeValues {
  const values: ThemeValues = {};
  let segmentStart = 0;

  for (let index = 0; index <= block.body.length; index += 1) {
    if (index < block.body.length && block.body[index] !== ';') continue;

    const rawSegment = block.body.slice(segmentStart, index);
    const segment = stripComments(rawSegment).trim();

    if (segment) {
      const colon = segment.indexOf(':');

      if (colon === -1) {
        if (segment.includes('--')) {
          errors.push(
            createError(
              source,
              block.bodyStart + segmentStart,
              'Invalid custom property declaration.',
              rawSegment.trim(),
            ),
          );
        }
      } else {
        const name = normalizeVariableName(segment.slice(0, colon));
        const value = segment.slice(colon + 1).trim();

        if (segment.slice(0, colon).trim().startsWith('--')) {
          if (!name || !value) {
            errors.push(
              createError(
                source,
                block.bodyStart + segmentStart,
                'Custom property declarations need both a name and a value.',
                rawSegment.trim(),
              ),
            );
          } else {
            values[name] = value;
          }
        }
      }
    }

    segmentStart = index + 1;
  }

  return values;
}

function findMatchingBrace(input: string, open: number): number {
  let depth = 0;
  let quote: string | undefined;
  let inComment = false;

  for (let index = open; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (inComment) {
      if (char === '*' && next === '/') {
        inComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (char === quote && input[index - 1] !== '\\') quote = undefined;
      continue;
    }

    if (char === '/' && next === '*') {
      inComment = true;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === '{') depth += 1;

    if (char === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}

function stripComments(value: string): string {
  return value.replace(/\/\*[\s\S]*?\*\//g, '');
}

function createError(source: string, index: number, message: string, snippet: string): ThemeParseError {
  const position = getLineColumn(source, index);

  return {
    message,
    snippet: snippet.trim().slice(0, 160),
    line: position.line,
    column: position.column,
  };
}

function getLineColumn(source: string, index: number): { line: number; column: number } {
  const prefix = source.slice(0, Math.max(0, index));
  const lines = prefix.split(/\r?\n/);

  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}
