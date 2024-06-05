import { GoogleSpreadsheet } from 'google-spreadsheet';

class GoogleSheetService {
  doc = undefined;

  constructor(id) {
    if (!id) {
      throw new Error("ID_UNDEFINED");
    }
    this.doc = new GoogleSpreadsheet(id);
  }

  /**
   * Autenticación con las credenciales del servicio
   */
  async authenticate() {
    await this.doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    });
  }

  /**
   * Recuperar el menú del día
   * @param {number} dayNumber
   * @returns {Promise<string[]>}
   */
  retriveDayMenu = async (dayNumber = 0) => {
    try {
      const list = [];
      await this.authenticate();
      await this.doc.loadInfo();
      const sheet = this.doc.sheetsByIndex[0]; // la primera hoja
      await sheet.loadCells('A1:G23'); // Ampliar el rango de celdas cargadas

      // Mapear correctamente los días de la semana
      const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
      const dayName = dayNames[dayNumber];

      // Encuentra la columna correspondiente al día de la semana
      let columnIndex = -1;
      for (let col = 0; col < 7; col++) {
        const cell = sheet.getCell(0, col);
        console.log(`Reading cell at row 0, column ${col}: ${cell.value}`); // Registro de depuración
        if (cell.value && cell.value.toLowerCase() === dayName) {
          columnIndex = col;
          break;
        }
      }

      // Agregar registros de depuración
      console.log(`Day Name: ${dayName}`);
      console.log(`Column Index: ${columnIndex}`);

      if (columnIndex === -1) {
        throw new Error(`No se encontró la columna para el día ${dayName}`);
      }

      for (let row = 1; row < 23; row++) { // Ajusta este rango según la estructura de tu hoja
        const cell = sheet.getCell(row, columnIndex);
        if (!cell) {
          console.error(`Cell at row ${row}, column ${columnIndex} not loaded`);
          continue;
        }
        const cellValue = cell ? cell.value : null;
        console.log(`Reading cell at row ${row}, column ${columnIndex}: ${cellValue}`);  // Registro de depuración
        if (cellValue) {
          list.push(cellValue);
        }
      }

      return list;
    } catch (err) {
      console.log(err);
      return [];
    }
  };

  /**
   * Guardar pedido
   * @param {object} data
   * @returns {Promise<void>}
   */
  saveOrder = async (data = {}) => {
    try {
      await this.authenticate();
      await this.doc.loadInfo();
      const sheet = this.doc.sheetsByIndex[1]; // la segunda hoja

      await sheet.addRow({
        fecha: data.fecha,
        telefono: data.telefono,
        nombre: data.nombre,
        codigo: data.codigo,
        pedido: data.pedido,
        observaciones: data.observaciones,
      });
    } catch (err) {
      console.log(err);
    }
  };
}

export default GoogleSheetService;
