import * as nivelModel from '../models/nivelModel.js'
import * as territorioModel from '../models/territorioModel.js'

export const listarNiveles = () => nivelModel.listar()
export const listarTerritorios = () => territorioModel.listar()
