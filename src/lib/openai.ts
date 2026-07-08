import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error('Missing OpenAI environment variable: OPENAI_API_KEY must be set.');
}

export const openai = new OpenAI({
  apiKey,
});
