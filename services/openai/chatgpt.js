import { Configuration, OpenAIApi } from "openai";

const completion = async (dataIn = '') => {
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);
  const response = await openai.createCompletion({
    model: "gpt-3.5-turbo",
    prompt: dataIn,
    max_tokens: 256,
    temperature: 0,
  });

  return response
}

export default { completion };
