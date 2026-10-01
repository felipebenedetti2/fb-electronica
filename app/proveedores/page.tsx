"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Proveedor = {
  id: number;
  nombre: string;
  telefono: string | null;
  email: string | null;
  observaciones: string | null;
  created_at: string | null;
};

type Compra = {
  id: number;
  costo_usd: number;
  forma_pago: string | null;
  fecha: string | null;
  equipo: {
    modelo: string;
    imei: string | null;
  } | null;
};

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [eliminandoProveedor, setEliminandoProveedor] =
    useState<number | null>(null);

  const [busqueda, setBusqueda] = useState("");

  // NUEVO PROVEEDOR
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [observaciones, setObservaciones] = useState("");

  // EDITAR PROVEEDOR
  const [editando, setEditando] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editTelefono, setEditTelefono] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editObservaciones, setEditObservaciones] = useState("");

  // DETALLE
  const [proveedorSeleccionado, setProveedorSeleccionado] =
    useState<Proveedor | null>(null);
  const [comprasProveedor, setComprasProveedor] = useState<Compra[]>([]);
  const [cargandoCompras, setCargandoCompras] = useState(false);

  async function cargarProveedores() {
    setCargando(true);

    const { data, error } = await supabase
      .from("proveedores")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) {
      console.error(error);
      alert("Error al cargar los proveedores.");
    } else {
      setProveedores(data || []);
    }

    setCargando(false);
  }

  useEffect(() => {
    cargarProveedores();
  }, []);

  async function guardarProveedor() {
    if (!nombre.trim()) {
      alert("Ingresá el nombre del proveedor.");
      return;
    }

    setGuardando(true);

    const { error } = await supabase.from("proveedores").insert({
      nombre: nombre.trim(),
      telefono: telefono.trim() || null,
      email: email.trim() || null,
      observaciones: observaciones.trim() || null,
    });

    if (error) {
      console.error(error);

      if (error.code === "23505") {
        alert("Ese proveedor ya existe.");
      } else {
        alert(
          `Error al guardar el proveedor: ${error.message}`
        );
      }

      setGuardando(false);
      return;
    }

    setNombre("");
    setTelefono("");
    setEmail("");
    setObservaciones("");

    await cargarProveedores();

    setGuardando(false);

    alert("Proveedor creado correctamente.");
  }

  function abrirEdicion(proveedor: Proveedor) {
    setEditId(proveedor.id);
    setEditNombre(proveedor.nombre || "");
    setEditTelefono(proveedor.telefono || "");
    setEditEmail(proveedor.email || "");
    setEditObservaciones(proveedor.observaciones || "");
    setEditando(true);
  }

  function cerrarEdicion() {
    setEditando(false);
    setEditId(null);
    setEditNombre("");
    setEditTelefono("");
    setEditEmail("");
    setEditObservaciones("");
  }

  async function guardarEdicion() {
    if (!editId) return;

    if (!editNombre.trim()) {
      alert("Ingresá el nombre del proveedor.");
      return;
    }

    setGuardando(true);

    const { error } = await supabase
      .from("proveedores")
      .update({
        nombre: editNombre.trim(),
        telefono: editTelefono.trim() || null,
        email: editEmail.trim() || null,
        observaciones:
          editObservaciones.trim() || null,
      })
      .eq("id", editId);

    if (error) {
      console.error(error);

      if (error.code === "23505") {
        alert("Ese proveedor ya existe.");
      } else {
        alert(
          `Error al actualizar el proveedor: ${error.message}`
        );
      }

      setGuardando(false);
      return;
    }

    await cargarProveedores();

    if (
      proveedorSeleccionado &&
      proveedorSeleccionado.id === editId
    ) {
      setProveedorSeleccionado({
        ...proveedorSeleccionado,
        nombre: editNombre.trim(),
        telefono: editTelefono.trim() || null,
        email: editEmail.trim() || null,
        observaciones:
          editObservaciones.trim() || null,
      });
    }

    setGuardando(false);
    cerrarEdicion();

    alert("Proveedor actualizado correctamente.");
  }

  async function eliminarProveedor(proveedor: Proveedor) {
    const confirmado = window.confirm(
      `¿Eliminar el proveedor "${proveedor.nombre}"?\n\n` +
        `Si este proveedor tiene compras asociadas, el sistema no permitirá eliminarlo.\n\n` +
        `Esta acción no se puede deshacer.`
    );

    if (!confirmado) return;

    setEliminandoProveedor(proveedor.id);

    const { error } = await supabase.rpc(
      "eliminar_proveedor",
      {
        p_proveedor_id: proveedor.id,
      }
    );

    setEliminandoProveedor(null);

    if (error) {
      console.error(error);

      alert(
        "No se pudo eliminar el proveedor: " +
          error.message
      );

      return;
    }

    if (
      proveedorSeleccionado?.id ===
      proveedor.id
    ) {
      cerrarDetalle();
    }

    await cargarProveedores();

    alert(
      "Proveedor eliminado correctamente ✅"
    );
  }

  async function abrirDetalle(proveedor: Proveedor) {
    setProveedorSeleccionado(proveedor);
    setComprasProveedor([]);
    setCargandoCompras(true);

    const { data, error } = await supabase
      .from("compras")
      .select(`
        id,
        costo_usd,
        forma_pago,
        fecha,
        equipo:equipos (
          modelo,
          imei
        )
      `)
      .eq("proveedor_id", proveedor.id)
      .order("fecha", { ascending: false });

    if (error) {
      console.error(error);
      alert("Error al cargar las compras del proveedor.");
    } else {
      setComprasProveedor(
        (data || []) as unknown as Compra[]
      );
    }

    setCargandoCompras(false);
  }

  function cerrarDetalle() {
    setProveedorSeleccionado(null);
    setComprasProveedor([]);
  }

  const proveedoresFiltrados = proveedores.filter(
    (proveedor) => {
      const texto =
        `${proveedor.nombre} ${
          proveedor.telefono || ""
        } ${proveedor.email || ""}`.toLowerCase();

      return texto.includes(busqueda.toLowerCase());
    }
  );

  const totalProveedores = proveedores.length;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-7xl">

        {/* ENCABEZADO */}

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Proveedores
          </h1>

          <p className="mt-1 text-gray-500">
            Administrá tus proveedores y consultá su historial de compras.
          </p>
        </div>

        {/* RESUMEN */}

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Total de proveedores
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {totalProveedores}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Proveedores encontrados
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {proveedoresFiltrados.length}
            </p>
          </div>

        </div>

        {/* NUEVO PROVEEDOR */}

        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">

          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Nuevo proveedor
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Agregá los datos del proveedor.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-900">
                Nombre
              </label>

              <input
                value={nombre}
                onChange={(e) =>
                  setNombre(e.target.value)
                }
                placeholder="Ej: Apple Wholesale"
                className="w-full rounded-xl border border-gray-300 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-900">
                Teléfono
              </label>

              <input
                value={telefono}
                onChange={(e) =>
                  setTelefono(e.target.value)
                }
                placeholder="Ej: +54 9..."
                className="w-full rounded-xl border border-gray-300 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-900">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="Ej: proveedor@email.com"
                className="w-full rounded-xl border border-gray-300 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-900">
                Observaciones
              </label>

              <input
                value={observaciones}
                onChange={(e) =>
                  setObservaciones(e.target.value)
                }
                placeholder="Notas del proveedor"
                className="w-full rounded-xl border border-gray-300 px-4 py-3"
              />
            </div>

          </div>

          <div className="mt-6 flex justify-end">

            <button
              onClick={guardarProveedor}
              disabled={guardando}
              className="rounded-xl bg-gray-900 px-6 py-3 font-semibold !text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando
                ? "Guardando..."
                : "Agregar proveedor"}
            </button>

          </div>

        </div>

        {/* LISTADO */}

        <div className="rounded-2xl bg-white shadow-sm">

          <div className="flex flex-col gap-4 border-b border-gray-200 px-6 py-5 md:flex-row md:items-center md:justify-between">

            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Lista de proveedores
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Hacé clic en un proveedor para ver sus compras.
              </p>
            </div>

            <div className="w-full md:w-80">

              <input
                value={busqueda}
                onChange={(e) =>
                  setBusqueda(e.target.value)
                }
                placeholder="Buscar proveedor..."
                className="w-full rounded-xl border border-gray-300 px-4 py-3"
              />

            </div>

          </div>

          {cargando ? (

            <div className="p-8 text-center text-gray-500">
              Cargando proveedores...
            </div>

          ) : proveedoresFiltrados.length === 0 ? (

            <div className="p-8 text-center text-gray-500">
              {busqueda
                ? "No se encontraron proveedores."
                : "Todavía no hay proveedores registrados."}
            </div>

          ) : (

            <div className="divide-y divide-gray-200">

              {proveedoresFiltrados.map(
                (proveedor) => (

                  <div
                    key={proveedor.id}
                    className="p-6 transition hover:bg-gray-50"
                  >

                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                      <button
                        onClick={() =>
                          abrirDetalle(proveedor)
                        }
                        className="min-w-0 text-left"
                      >

                        <div className="flex flex-wrap items-center gap-2">

                          <h3 className="text-lg font-bold text-gray-900">
                            {proveedor.nombre}
                          </h3>

                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                            Proveedor
                          </span>

                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-x-8 gap-y-2 text-sm text-gray-600 md:grid-cols-2">

                          {proveedor.telefono && (
                            <p>
                              <span className="font-medium text-gray-900">
                                Teléfono:
                              </span>{" "}
                              {proveedor.telefono}
                            </p>
                          )}

                          {proveedor.email && (
                            <p>
                              <span className="font-medium text-gray-900">
                                Email:
                              </span>{" "}
                              {proveedor.email}
                            </p>
                          )}

                          {proveedor.observaciones && (
                            <p className="md:col-span-2">
                              <span className="font-medium text-gray-900">
                                Observaciones:
                              </span>{" "}
                              {proveedor.observaciones}
                            </p>
                          )}

                        </div>

                      </button>

                      <div className="flex shrink-0 flex-wrap gap-2">

                        <button
                          onClick={() =>
                            abrirDetalle(proveedor)
                          }
                          className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold !text-white transition hover:bg-gray-800"
                        >
                          Ver compras
                        </button>

                        <button
                          onClick={() =>
                            abrirEdicion(proveedor)
                          }
                          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold !text-white transition hover:bg-blue-700"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() =>
                            eliminarProveedor(
                              proveedor
                            )
                          }
                          disabled={
                            eliminandoProveedor ===
                            proveedor.id
                          }
                          className="rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {eliminandoProveedor ===
                          proveedor.id
                            ? "Eliminando..."
                            : "Eliminar"}
                        </button>

                      </div>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </div>

      </div>

      {/* MODAL EDITAR */}

      {editando && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">

              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Editar proveedor
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Modificá los datos del proveedor.
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

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-900">
                    Nombre
                  </label>

                  <input
                    value={editNombre}
                    onChange={(e) =>
                      setEditNombre(e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-900">
                    Teléfono
                  </label>

                  <input
                    value={editTelefono}
                    onChange={(e) =>
                      setEditTelefono(e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-900">
                    Email
                  </label>

                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) =>
                      setEditEmail(e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-900">
                    Observaciones
                  </label>

                  <input
                    value={editObservaciones}
                    onChange={(e) =>
                      setEditObservaciones(
                        e.target.value
                      )
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

      {/* MODAL DETALLE */}

      {proveedorSeleccionado && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">

              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {proveedorSeleccionado.nombre}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Historial de compras
                </p>
              </div>

              <button
                onClick={cerrarDetalle}
                className="rounded-lg px-3 py-2 text-xl !text-gray-500 hover:bg-gray-100 hover:!text-gray-900"
              >
                ×
              </button>

            </div>

            <div className="p-6">

              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">

                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">
                    Compras
                  </p>

                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {comprasProveedor.length}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">
                    Total comprado
                  </p>

                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    USD{" "}
                    {comprasProveedor
                      .reduce(
                        (total, compra) =>
                          total +
                          Number(
                            compra.costo_usd || 0
                          ),
                        0
                      )
                      .toFixed(2)}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">
                    Contacto
                  </p>

                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {proveedorSeleccionado.telefono ||
                      proveedorSeleccionado.email ||
                      "Sin datos"}
                  </p>
                </div>

              </div>

              {cargandoCompras ? (

                <div className="p-8 text-center text-gray-500">
                  Cargando historial...
                </div>

              ) : comprasProveedor.length === 0 ? (

                <div className="rounded-xl bg-gray-50 p-8 text-center text-gray-500">
                  Este proveedor todavía no tiene compras registradas.
                </div>

              ) : (

                <div className="overflow-hidden rounded-xl border border-gray-200">

                  <div className="divide-y divide-gray-200">

                    {comprasProveedor.map(
                      (compra) => (

                        <div
                          key={compra.id}
                          className="p-5"
                        >

                          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                            <div>

                              <p className="font-bold text-gray-900">
                                {compra.equipo?.modelo ||
                                  "Equipo"}
                              </p>

                              {compra.equipo?.imei && (
                                <p className="mt-1 text-sm text-gray-500">
                                  IMEI:{" "}
                                  {compra.equipo.imei}
                                </p>
                              )}

                              <p className="mt-1 text-sm text-gray-500">
                                Compra #{compra.id}
                              </p>

                            </div>

                            <div className="text-left md:text-right">

                              <p className="text-lg font-bold text-gray-900">
                                USD{" "}
                                {Number(
                                  compra.costo_usd
                                ).toFixed(2)}
                              </p>

                              <p className="mt-1 text-sm text-gray-500">
                                {compra.forma_pago ||
                                  "Sin forma de pago"}
                              </p>

                              {compra.fecha && (
                                <p className="mt-1 text-xs text-gray-400">
                                  {new Date(
                                    compra.fecha
                                  ).toLocaleDateString(
                                    "es-AR"
                                  )}
                                </p>
                              )}

                            </div>

                          </div>

                        </div>

                      )
                    )}

                  </div>

                </div>

              )}

            </div>

          </div>

        </div>

      )}

    </div>
  );
}