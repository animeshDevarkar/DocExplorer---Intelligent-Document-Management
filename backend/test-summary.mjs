import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const text = "Internet of Things (IoT) is the internetworking of physical devices like vehicles, buildings, electronic devices, sensors, actuators etc. that are capable of communicating among themselves while as Artificial Intelligence (AI) is a field of computer science in which a machine is equipped with the ability to mimic cognitive functions of a human or any being that is capable of cognitive thinking that can make decisions based on its past experiences. There is a clear intersection between the Internet of Things (IoT) and Artificial Intelligence (AI). IoT is about connecting machines and making use of the data generated from those machines. AI is about simulating intelligent behavior in machines of all kinds. Clearly an overlap. As IoT devices will generate vast amounts of data, then AI will be functionally necessary to deal with these huge volumes if we're to have any chance of making sense of the data. Simply AI is the key to unlock IoT potential. There is a clear signal from various reports, for example Venture Capital. Venture capital funding of AI-focused IoT start-ups is growing fast, in the first eight months of 2017, this group of start-ups raised $705 million. There are many vendors of AI & IoT, such as Amazon, IBM, Microsoft, GE, Oracle etc. Gartner is the world’s leading research and advisory company, predicts that by 2022, more than 80 percent of enterprise IoT projects will includes an AI component, up from only 10 percent today.";

async function run() {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Please provide a very brief 2-sentence TL;DR summary and 3 key bullet points for this document based on the following extracted text:\n\n${text}`,
            config: { 
                temperature: 0.3,
                maxOutputTokens: 300 
            }
        });
        console.log("RESPONSE TEXT:");
        console.log(response.text);
        console.log("FULL RESPONSE:", JSON.stringify(response, null, 2));
    } catch(e) {
        console.error(e);
    }
}
run();
