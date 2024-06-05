import "dotenv/config";
import bot from "@bot-whatsapp/bot";
import { getDay } from "date-fns";
import pkg from "date-fns-tz";  // Importar date-fns-tz como paquete
const { utcToZonedTime, format } = pkg;  // Extraer utcToZonedTime y format del paquete
import QRPortalWeb from "@bot-whatsapp/portal";
import BaileysProvider from "@bot-whatsapp/provider/baileys";
import MockAdapter from "@bot-whatsapp/database/mock";

import GoogleSheetService from "./services/sheets/index.js";
import { createOpenAICompletion } from './services/openai/chatgpt.js';

// Definir la zona horaria de Lima, Perú
const timeZone = 'America/Lima';

const googelSheet = new GoogleSheetService(
  "1mMmK3-QGa1GcOYndz3mibReDx2zg0-p2UyltklTWfes"
);

const GLOBAL_STATE = [];

const flowPrincipal = bot
  .addKeyword(["menu UNI"])
  .addAnswer([
    `Bienvenido al Comedor de la UNI`,
    `Tenemos menús diarios variados`,
    `Escribe *menu* para mandarte la lista de comidas`,
  ]);

const flowMenu = bot
  .addKeyword("menu")
  .addAnswer(
    `Hoy tenemos el siguiente menú:`,
    null,
    async (_, { flowDynamic }) => {
      const now = new Date();
      const zonedDate = utcToZonedTime(now, timeZone);
      const dayNumber = getDay(zonedDate); // Obtener el día de la semana en la zona horaria de Lima

      // Agregar registros de depuración
      console.log(`Fecha y hora actual en UTC: ${now}`);
      console.log(`Fecha y hora actual en Lima, Perú: ${format(zonedDate, 'yyyy-MM-dd HH:mm:ssXXX', { timeZone })}`);
      console.log(`Número del día de la semana en Lima, Perú: ${dayNumber}`);

      const getMenu = await googelSheet.retriveDayMenu(dayNumber);
      for (const menu of getMenu) {
        GLOBAL_STATE.push(menu);
        await flowDynamic(menu);
      }
    }
  )
  .addAnswer(
    `¿Qué Turno deseas separar? (Desayuno, Almuerzo o Cena)`,
    { capture: true },
    async (ctx, { gotoFlow, state }) => {
      const txt = ctx.body;
      state.update({ pedido: txt });

      const check = await createOpenAICompletion(`
        Hoy el menú de comida es el siguiente:
        "
        ${GLOBAL_STATE.join("\n")}
        "
        El Estudiante quiere separar turno "${txt}"
        Basado en el menú y lo que quiere el cliente determinar (EXISTE, NO_EXISTE).
        La orden del Estudiante
      `);

      const getCheck = check && check.data && check.data.choices && check.data.choices[0] ? check.data.choices[0].text.trim().replace("\n", "").replace(".", "").replace(" ", "") : 'No se pudo obtener la respuesta de OpenAI'
        .trim()
        .replace("\n", "")
        .replace(".", "")
        .replace(" ", "");

      if (getCheck.includes("NO_EXISTE")) {
        return gotoFlow(flowEmpty);
      } else {
        return gotoFlow(flowPedido);
      }
    }
  );

const flowEmpty = bot
  .addKeyword(bot.EVENTS.ACTION)
  .addAnswer("No te he entendido!", null, async (_, { gotoFlow }) => {
    return gotoFlow(flowMenu);
  });

const flowPedido = bot
  .addKeyword(["pedir"], { sensitive: true })
  .addAnswer(
    "¿Cuál es tu Nombre?",
    { capture: true },
    async (ctx, { state }) => {
      state.update({ name: ctx.body });
    }
  )
  .addAnswer(
    "¿Cuál es tu Código Universitario?",
    { capture: true },
    async (ctx, { state }) => {
      state.update({ codigo: ctx.body });
    }
  )
  .addAnswer(
    "Escribe alguna observación que tengas. Si no la tienes, escribe 'ok' ",
    { capture: true },
    async (ctx, { state }) => {
      state.update({ observaciones: ctx.body });
    }
  )
  .addAnswer(
    "¡Perfecto, tu comida estará lista en el Comedor universitario! No olvides llegar a la hora correspondiente",
    null,
    async (ctx, { state }) => {
      const currentState = state.getMyState();
      await googelSheet.saveOrder({
        fecha: new Date().toDateString(),
        telefono: ctx.from,
        nombre: currentState.name,
        codigo: currentState.codigo,
        pedido: currentState.pedido,
        observaciones: currentState.observaciones,
      });
    }
  );

const main = async () => {
  const adapterDB = new MockAdapter();
  const adapterFlow = bot.createFlow([
    flowPrincipal,
    flowMenu,
    flowPedido,
    flowEmpty,
  ]);
  const adapterProvider = bot.createProvider(BaileysProvider);

  bot.createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  });

  QRPortalWeb();
};

main();
