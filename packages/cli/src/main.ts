#!/usr/bin/env node
import { AUTOMATION_SCHEMA, executeAutomation } from '@banora/sdk/automation';
import { decodeSgf, serializeSgf } from '@banora/sdk/sgf';
import { CliError, json, readInput, saveOutput } from './io.js';
import metadata from '../package.json';
import { diagnose, diagnosticError } from './diagnostics.js';

const commands = {
  schema: [],
  run: ['request', 'output', 'force'],
  diagnose: ['request', 'output', 'force'],
  inspect: ['input', 'tree', 'profile'],
  search: ['input', 'query', 'properties', 'game', 'offset', 'limit', 'case-sensitive'],
  edit: ['input', 'operations', 'output', 'force', 'profile'],
  create: ['size', 'operations', 'output', 'force', 'profile'],
  snapshot: ['input', 'output', 'force'],
} as const;
const help = {
  schemaVersion: 'banora.cli/v1',
  ok: true,
  commands: Object.entries(commands).map(([name, flags]) => ({
    name,
    flags: flags.map((flag) => `--${flag}`),
  })),
  usage:
    'banora schema | run --request FILE | diagnose --request FILE | inspect --input SGF | search --input SGF --query TEXT | edit --input SGF --operations JSON | create --size N | snapshot --input JSON',
  stdin: 'Use - instead of a filename. run and diagnose default to stdin.',
  output:
    'One JSON response on stdout. --output saves successful SGF or normalized snapshot JSON; existing files require --force. Inputs are never overwritten.',
  coordinates: 'Zero-based x,y from top left. Discover operation fields with banora schema.',
  diagnostics:
    'diagnose executes a request once on isolated state and returns banora.cli-diagnostics/v1 without authored data. --output saves this report even on SDK failure; no SGF is saved.',
  exitCodes: { success: 0, usageOrInput: 2, commandFailed: 3, outputFailed: 4 },
  version: metadata.version,
};

async function main() {
  const argv = process.argv.slice(2),
    command = argv.shift();
  if (!command || command === '--help' || command === 'help') {
    if (argv.length) throw new CliError('usage', 'Help accepts no additional arguments.');
    return help;
  }
  if (command === '--version') {
    if (argv.length) throw new CliError('usage', 'Version accepts no additional arguments.');
    return { schemaVersion: 'banora.cli/v1', ok: true, version: metadata.version };
  }
  if (!Object.hasOwn(commands, command))
    throw new CliError('usage', 'Unknown command. Run banora --help.');
  const allowed = commands[command as keyof typeof commands] as readonly string[];
  const flags: Record<string, string | boolean> = {};
  while (argv.length) {
    const token = argv.shift()!,
      name = token.slice(2);
    if (!token.startsWith('--') || !allowed.includes(name) || Object.hasOwn(flags, name))
      throw new CliError('usage', 'Unknown, positional or repeated argument. Run banora --help.');
    if (name === 'force' || name === 'tree' || name === 'case-sensitive') flags[name] = true;
    else {
      const value = argv.shift();
      if (value === undefined || value.startsWith('--') || (value === '' && name !== 'query'))
        throw new CliError('usage', `--${name} requires a value.`);
      flags[name] = value;
    }
  }
  if (command === 'schema') return AUTOMATION_SCHEMA;
  if (flags.force && !flags.output) throw new CliError('usage', '--force requires --output.');
  const inputPaths: string[] = [];
  const read = async (path: string) => {
    if (path === '-' && inputPaths.includes('-'))
      throw new CliError('usage', 'Stdin may supply only one input.');
    inputPaths.push(path);
    return readInput(path);
  };
  if (command === 'diagnose') {
    let bytes: Buffer;
    try {
      bytes = await read(typeof flags.request === 'string' ? flags.request : '-');
    } catch (error) {
      process.exitCode = 2;
      return diagnosticError(error instanceof CliError ? error.code : 'input', 'io', 'read');
    }
    let input: unknown;
    try {
      input = json(bytes);
    } catch {
      process.exitCode = 2;
      return diagnosticError('input', 'automation', 'invalid-input');
    }
    const result = diagnose(input);
    if (typeof flags.output === 'string') {
      try {
        await saveOutput(
          flags.output,
          JSON.stringify(result, null, 2) + '\n',
          inputPaths,
          flags.force === true,
        );
      } catch {
        process.exitCode = 4;
        return diagnosticError('output', 'io', 'write', result);
      }
    }
    if (!result.ok) process.exitCode = 3;
    return result;
  }
  let request: unknown;
  if (command === 'run')
    request = json(await read(typeof flags.request === 'string' ? flags.request : '-'));
  else if (command === 'snapshot') {
    if (typeof flags.input !== 'string') throw new CliError('usage', 'snapshot requires --input.');
    request = {
      schemaVersion: 'banora.automation/v1',
      kind: 'snapshot',
      state: json(await read(flags.input)),
    };
  } else {
    let sgf: string | undefined;
    if (command !== 'create') {
      if (typeof flags.input !== 'string')
        throw new CliError('usage', `${command} requires --input.`);
      const parsed = decodeSgf(await read(flags.input));
      if (!parsed.ok)
        throw new CliError('input', parsed.diagnostics.map((item) => item.message).join('; '));
      sgf = serializeSgf(parsed.record);
    }
    if (command === 'edit' && typeof flags.operations !== 'string')
      throw new CliError('usage', 'edit requires --operations JSON_FILE.');
    if (typeof flags.size === 'string' && !/^\d+$/.test(flags.size))
      throw new CliError('usage', 'Size must be an integer from 2 through 52.');
    for (const name of ['game', 'offset', 'limit'])
      if (typeof flags[name] === 'string' && !/^\d+$/.test(flags[name]))
        throw new CliError('usage', `--${name} requires a nonnegative decimal integer.`);
    request = {
      schemaVersion: 'banora.automation/v1',
      kind: 'record',
      ...(sgf === undefined ? {} : { sgf }),
      ...(typeof flags.size === 'string' ? { size: Number(flags.size) } : {}),
      ...(typeof flags.profile === 'string' ? { profile: flags.profile } : {}),
      ...(typeof flags.operations === 'string'
        ? { operations: json(await read(flags.operations)) }
        : {}),
      ...(flags.tree ? { includeTree: true } : {}),
      ...(command === 'search'
        ? {
            operations: [
              {
                op: 'search',
                query: flags.query ?? '',
                ...(typeof flags.properties === 'string'
                  ? { properties: flags.properties.split(',').map((key) => key.trim()) }
                  : {}),
                ...(typeof flags.game === 'string' ? { gameIndex: Number(flags.game) } : {}),
                ...(typeof flags.offset === 'string' ? { offset: Number(flags.offset) } : {}),
                ...(typeof flags.limit === 'string' ? { limit: Number(flags.limit) } : {}),
                ...(flags['case-sensitive'] ? { caseSensitive: true } : {}),
              },
            ],
          }
        : {}),
    };
  }
  const result = executeAutomation(request);
  if (!result.ok) {
    process.exitCode = 3;
    return result;
  }
  if (typeof flags.output === 'string') {
    const content =
      result.kind === 'record' ? result.sgf : JSON.stringify(result.snapshot, null, 2) + '\n';
    const output = await saveOutput(flags.output, content, inputPaths, flags.force === true);
    return { ...result, output };
  }
  return result;
}
try {
  process.stdout.write(JSON.stringify(await main()) + '\n');
} catch (error) {
  const known = error instanceof CliError;
  process.exitCode = known && error.code === 'output' ? 4 : 2;
  process.stdout.write(
    JSON.stringify(
      process.argv[2] === 'diagnose'
        ? diagnosticError(known ? error.code : 'input')
        : {
            schemaVersion: 'banora.cli/v1',
            ok: false,
            error: {
              code: known ? error.code : 'input',
              message: known ? error.message : 'Request could not be processed.',
            },
          },
    ) + '\n',
  );
}
