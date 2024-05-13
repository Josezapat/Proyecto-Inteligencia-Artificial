import axios from "axios";

const createOpenAICompletion = async (dataIn = '') => {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        messages: [{ role: "user", content: dataIn }],
        model: "gpt-3.5-turbo",
        temperature: 0.7 // Puedes ajustar esto según tus necesidades
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );

    return response.data.choices[0].text;
  } catch (error) {
    console.error("Error en la solicitud a la API de OpenAI:", error);
    throw error;
  }
};

export { createOpenAICompletion };
