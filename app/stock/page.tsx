"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Equipo = {
  id: number;
  modelo: string;
  descripcion: string | null;
  imei: string | null;
  estado: string;
  bateria: number | null;
  color: string | null;
  costo_usd: number;
  precio_venta_usd: number | null;
  fecha_ingreso: string | null;
  estado_stock: string;
};

export default function StockPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  // =========================
  // NUEVO EQUIPO
  // =========================

  const [modelo, setModelo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [imei, setImei] = useState("");
  const [estado, setEstado] = useState("Usado");
  const [bateria, setBateria] = useState("");
  const [color, setColor] = useState("");
  const [costo, setCosto] = useState("");
  const [precioVenta, setPrecioVenta] = useState("");

  // =========================
  // EDITAR EQUIPO
  // =========================

  const [editando, setEditando] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [editModelo, setEditModelo] = useState("");
  const [editDescripcion, setEditDescripcion] = useState("");
  const [editImei, setEditImei] = useState("");
  const [editEstado, setEditEstado] = useState("Usado");
  const [editBateria, setEditBateria] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editCosto, setEditCosto] = useState("");
  const [editPrecioVenta, setEditPrecioVenta] = useState("");

  // =========================
  // CARGAR STOCK
  // =========================

  async function cargarEquipos() {
    setCargando(true);

    const { data, error } = await supabase
      .from("equipos")
      .select("*")
      .eq("estado_stock", "disponible")
      .order("id", { ascending: false });

    if (error) {
      console.error(error);
      alert("Error al cargar el stock.");
    } else {
      setEquipos(data || []);
    }

    setCargando(false);
  }

  useEffect(() => {
    cargarEquipos();
  }, []);

  // =========================
  // INGRESAR EQUIPO
  // =========================

  async function guardarEquipo() {
    if (!modelo.trim()) {
      alert("Ingresá el modelo del equipo.");
      return;
    }

    if (!costo || Number(costo) < 0) {
      alert("Ingresá un costo válido.");
      return;
    }

    setGuardando(true);

    const { error } = await supabase.rpc("ingresar_equipo", {
      p_modelo: modelo,
      p_descripcion: descripcion,
      p_imei: imei,
      p_estado: estado,
      p_bateria: bateria ? Number(bateria) : null,
      p_color: color,
      p_costo_usd: Number(costo),
      p_precio_venta_usd: precioVenta
        ? Number(precioVenta)
        : null,
    });

    if (error) {
      console.error(error);

      if (error.code === "23505") {
        alert("Ese IMEI ya está registrado.");
      } else {
        alert(`Error al guardar el equipo: ${error.message}`);
      }

      setGuardando(false);
      return;
    }

    setModelo("");
    setDescripcion("");
    setImei("");
    setEstado("Usado");
    setBateria("");
    setColor("");
    setCosto("");
    setPrecioVenta("");

    await cargarEquipos();

    setGuardando(false);

    alert("Equipo ingresado correctamente.");
  }

  // =========================
  // ABRIR EDICIÓN
  // =========================

  function abrirEdicion(equipo: Equipo) {
    setEditId(equipo.id);

    setEditModelo(equipo.modelo || "");
    setEditDescripcion(equipo.descripcion || "");
    setEditImei(equipo.imei || "");
    setEditEstado(equipo.estado || "Usado");

    setEditBateria(
      equipo.bateria !== null &&
        equipo.bateria !== undefined
        ? String(equipo.bateria)
        : ""
    );

    setEditColor(equipo.color || "");

    setEditCosto(
      equipo.costo_usd !== null &&
        equipo.costo_usd !== undefined
        ? String(equipo.costo_usd)
        : ""
    );

    setEditPrecioVenta(
      equipo.precio_venta_usd !== null &&
        equipo.precio_venta_usd !== undefined
        ? String(equipo.precio_venta_usd)
        : ""
    );

    setEditando(true);
  }

  // =========================
  // CERRAR EDICIÓN
  // =========================

  function cerrarEdicion() {
    setEditando(false);
    setEditId(null);
  }

  // =========================
  // GUARDAR EDICIÓN
  // =========================

  async function guardarEdicion() {
    if (!editId) return;

    if (!editModelo.trim()) {
      alert("Ingresá el modelo del equipo.");
      return;
    }

    if (!editCosto || Number(editCosto) < 0) {
      alert("Ingresá un costo válido.");
      return;
    }

    setGuardando(true);

    const { error } = await supabase
      .from("equipos")
      .update({
        modelo: editModelo.trim(),
        descripcion: editDescripcion.trim() || null,
        imei: editImei.trim() || null,
        estado: editEstado,
        bateria: editBateria
          ? Number(editBateria)
          : null,
        color: editColor.trim() || null,
        costo_usd: Number(editCosto),
        precio_venta_usd: editPrecioVenta
          ? Number(editPrecioVenta)
          : null,
      })
      .eq("id", editId);

    if (error) {
      console.error(error);

      if (error.code === "23505") {
        alert("Ese IMEI ya está registrado en otro equipo.");
      } else {
        alert(
          `Error al actualizar el equipo: ${error.message}`
        );
      }

      setGuardando(false);
      return;
    }

    await cargarEquipos();

    setGuardando(false);
    cerrarEdicion();

    alert("Equipo actualizado correctamente.");
  }

  // =========================
  // ELIMINAR EQUIPO
  // =========================

  async function eliminarEquipo(equipo: Equipo) {
    const confirmar = window.confirm(
      `¿Estás seguro de eliminar este equipo?\n\n${equipo.modelo}${
        equipo.imei
          ? `\nIMEI: ${equipo.imei}`
          : ""
      }\nCosto: USD ${Number(equipo.costo_usd).toFixed(
        2
      )}\n\nEsta acción también revertirá el movimiento de liquidez generado al ingresarlo.`
    );

    if (!confirmar) {
      return;
    }

    setEliminando(true);

    const { error } = await supabase.rpc(
      "eliminar_equipo_stock",
      {
        p_equipo_id: equipo.id,
      }
    );

    if (error) {
      console.error(error);

      alert(
        `No se pudo eliminar el equipo: ${error.message}`
      );

      setEliminando(false);
      return;
    }

    await cargarEquipos();

    setEliminando(false);

    alert("Equipo eliminado correctamente.");
  }

  // =========================
  // CÁLCULOS
  // =========================

  const valorStock = equipos.reduce(
    (total, equipo) =>
      total + Number(equipo.costo_usd || 0),
    0
  );

  const gananciaPotencial = equipos.reduce(
    (total, equipo) =>
      total +
      Math.max(
        Number(equipo.precio_venta_usd || 0) -
          Number(equipo.costo_usd || 0),
        0
      ),
    0
  );

  // =========================
  // HTML
  // =========================

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-7xl">

        {/* ENCABEZADO */}

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Stock
          </h1>

          <p className="mt-1 text-gray-500">
            Equipos disponibles actualmente
          </p>
        </div>

        {/* RESUMEN */}

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Equipos en stock
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {equipos.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Valor del stock
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              USD {valorStock.toFixed(2)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Ganancia potencial
            </p>

            <p className="mt-2 text-3xl font-bold text-green-600">
              USD {gananciaPotencial.toFixed(2)}
            </p>
          </div>

        </div>

        {/* INGRESAR EQUIPO */}

        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">

          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Ingresar equipo
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Agregá un nuevo equipo al stock.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">

            <div>
              <label className="mb-1 block text-sm font-medium">
                Modelo
              </label>

              <input
                value={modelo}
                onChange={(e) =>
                  setModelo(e.target.value)
                }
                placeholder="Ej: iPhone 16 Pro"
                className="w-full rounded-xl border border-gray-300 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Descripción
              </label>

              <input
                value={descripcion}
                onChange={(e) =>
                  setDescripcion(e.target.value)
                }
                placeholder="Ej: 256GB"
                className="w-full rounded-xl border border-gray-300 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                IMEI
              </label>

              <input
                value={imei}
                onChange={(e) =>
                  setImei(e.target.value)
                }
                placeholder="IMEI"
                className="w-full rounded-xl border border-gray-300 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Estado
              </label>

              <select
                value={estado}
                onChange={(e) =>
                  setEstado(e.target.value)
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3"
              >
                <option value="Nuevo">Nuevo</option>
                <option value="Usado">Usado</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Batería %
              </label>

              <input
                type="number"
                value={bateria}
                onChange={(e) =>
                  setBateria(e.target.value)
                }
                placeholder="Ej: 98"
                className="w-full rounded-xl border border-gray-300 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Color
              </label>

              <input
                value={color}
                onChange={(e) =>
                  setColor(e.target.value)
                }
                placeholder="Ej: Negro"
                className="w-full rounded-xl border border-gray-300 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Costo USD
              </label>

              <input
                type="number"
                step="0.01"
                value={costo}
                onChange={(e) =>
                  setCosto(e.target.value)
                }
                placeholder="Ej: 700"
                className="w-full rounded-xl border border-gray-300 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Precio de venta USD
              </label>

              <input
                type="number"
                step="0.01"
                value={precioVenta}
                onChange={(e) =>
                  setPrecioVenta(e.target.value)
                }
                placeholder="Ej: 850"
                className="w-full rounded-xl border border-gray-300 px-4 py-3"
              />
            </div>

          </div>

          <div className="mt-6 flex justify-end">

            <button
              onClick={guardarEquipo}
              disabled={guardando}
              className="rounded-xl bg-gray-900 px-6 py-3 font-semibold !text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando
                ? "Guardando..."
                : "Ingresar equipo"}
            </button>

          </div>

        </div>

        {/* LISTADO */}

        <div className="rounded-2xl bg-white shadow-sm">

          <div className="border-b border-gray-200 px-6 py-5">
            <h2 className="text-xl font-bold text-gray-900">
              Equipos disponibles
            </h2>
          </div>

          {cargando ? (

            <div className="p-8 text-center text-gray-500">
              Cargando stock...
            </div>

          ) : equipos.length === 0 ? (

            <div className="p-8 text-center text-gray-500">
              No hay equipos disponibles en stock.
            </div>

          ) : (

            <div className="divide-y divide-gray-200">

              {equipos.map((equipo) => {

                const ganancia =
                  Number(
                    equipo.precio_venta_usd || 0
                  ) -
                  Number(
                    equipo.costo_usd || 0
                  );

                return (
                  <div
                    key={equipo.id}
                    className="p-6 transition hover:bg-gray-50"
                  >

                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                      {/* INFORMACIÓN */}

                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-2">

                          <h3 className="text-lg font-bold text-gray-900">
                            {equipo.modelo}
                          </h3>

                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                            Disponible
                          </span>

                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                            {equipo.estado}
                          </span>

                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-x-8 gap-y-2 text-sm text-gray-600 md:grid-cols-2">

                          {equipo.descripcion && (
                            <p>
                              <span className="font-medium text-gray-900">
                                Descripción:
                              </span>{" "}
                              {equipo.descripcion}
                            </p>
                          )}

                          {equipo.color && (
                            <p>
                              <span className="font-medium text-gray-900">
                                Color:
                              </span>{" "}
                              {equipo.color}
                            </p>
                          )}

                          {equipo.bateria !== null && (
                            <p>
                              <span className="font-medium text-gray-900">
                                Batería:
                              </span>{" "}
                              {equipo.bateria}%
                            </p>
                          )}

                          {equipo.imei && (
                            <p>
                              <span className="font-medium text-gray-900">
                                IMEI:
                              </span>{" "}
                              {equipo.imei}
                            </p>
                          )}

                          <p>
                            <span className="font-medium text-gray-900">
                              Costo:
                            </span>{" "}
                            USD{" "}
                            {Number(
                              equipo.costo_usd
                            ).toFixed(2)}
                          </p>

                          <p>
                            <span className="font-medium text-gray-900">
                              Venta:
                            </span>{" "}
                            {equipo.precio_venta_usd
                              ? `USD ${Number(
                                  equipo.precio_venta_usd
                                ).toFixed(2)}`
                              : "Sin precio"}
                          </p>

                        </div>

                      </div>

                      {/* ACCIONES */}

                      <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">

                        {equipo.precio_venta_usd && (
                          <div className="text-left lg:text-right">

                            <p className="text-sm text-gray-500">
                              Ganancia estimada
                            </p>

                            <p
                              className={`text-xl font-bold ${
                                ganancia >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              USD{" "}
                              {ganancia.toFixed(2)}
                            </p>

                          </div>
                        )}

                        <div className="flex gap-2">

                          {/* EDITAR */}

                          <button
                            onClick={() =>
                              abrirEdicion(equipo)
                            }
                            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold !text-white transition hover:bg-blue-700"
                          >
                            Editar
                          </button>

                          {/* ELIMINAR */}

                          <button
                            onClick={() =>
                              eliminarEquipo(equipo)
                            }
                            disabled={eliminando}
                            className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold !text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Eliminar
                          </button>

                        </div>

                      </div>

                    </div>

                  </div>
                );
              })}

            </div>
          )}

        </div>

      </div>

      {/* =========================
          MODAL EDITAR
          ========================= */}

      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">

              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Editar equipo
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Corregí los datos del equipo.
                </p>
              </div>

              <button
                onClick={cerrarEdicion}
                className="rounded-lg px-3 py-2 text-xl !text-gray-500 hover:bg-gray-100 hover:!text-gray-900"
              >
                ×
              </button>

            </div>

            <div className="p-6">

              <div className="mb-6 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
                <strong>Importante:</strong>{" "}
                editar los datos del equipo no genera
                ningún movimiento de liquidez.
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Modelo
                  </label>

                  <input
                    value={editModelo}
                    onChange={(e) =>
                      setEditModelo(e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Descripción
                  </label>

                  <input
                    value={editDescripcion}
                    onChange={(e) =>
                      setEditDescripcion(e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    IMEI
                  </label>

                  <input
                    value={editImei}
                    onChange={(e) =>
                      setEditImei(e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Estado
                  </label>

                  <select
                    value={editEstado}
                    onChange={(e) =>
                      setEditEstado(e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3"
                  >
                    <option value="Nuevo">
                      Nuevo
                    </option>

                    <option value="Usado">
                      Usado
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Batería %
                  </label>

                  <input
                    type="number"
                    value={editBateria}
                    onChange={(e) =>
                      setEditBateria(e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Color
                  </label>

                  <input
                    value={editColor}
                    onChange={(e) =>
                      setEditColor(e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Costo USD
                  </label>

                  <input
                    type="number"
                    step="0.01"
                    value={editCosto}
                    onChange={(e) =>
                      setEditCosto(e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Precio de venta USD
                  </label>

                  <input
                    type="number"
                    step="0.01"
                    value={editPrecioVenta}
                    onChange={(e) =>
                      setEditPrecioVenta(e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3"
                  />
                </div>

              </div>

              <div className="mt-8 flex justify-end gap-3">

                <button
                  onClick={cerrarEdicion}
                  disabled={guardando}
                  className="rounded-xl border border-gray-300 bg-white px-6 py-3 font-semibold !text-gray-700 hover:bg-gray-100"
                >
                  Cancelar
                </button>

                <button
                  onClick={guardarEdicion}
                  disabled={guardando}
                  className="rounded-xl bg-gray-900 px-6 py-3 font-semibold !text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {guardando
                    ? "Guardando..."
                    : "Guardar cambios"}
                </button>

              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}