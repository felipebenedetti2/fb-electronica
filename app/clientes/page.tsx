"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Cliente = {
  id: number;
  nombre: string;
  telefono: string | null;
  email: string | null;
  documento: string | null;
  created_at: string;
};

type Venta = {
  id: number;
  precio_venta_usd: number;
  ganancia_usd: number;
  forma_pago: string | null;
  fecha: string;
  tiene_permuta: boolean;
  equipo: {
    modelo: string;
  } | null;
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] =
    useState<Cliente | null>(null);

  const [ventasCliente, setVentasCliente] = useState<Venta[]>([]);

  const [busqueda, setBusqueda] = useState("");

  const [cargando, setCargando] = useState(true);
  const [cargandoVentas, setCargandoVentas] = useState(false);

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [documento, setDocumento] = useState("");

  const [guardando, setGuardando] = useState(false);

  // EDITAR
  const [editando, setEditando] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editTelefono, setEditTelefono] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editDocumento, setEditDocumento] = useState("");

  // ELIMINAR
  const [eliminandoCliente, setEliminandoCliente] =
    useState<number | null>(null);

  async function cargarClientes() {
    setCargando(true);

    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) {
      console.error(error);
      setCargando(false);
      return;
    }

    setClientes(data || []);
    setCargando(false);
  }

  useEffect(() => {
    cargarClientes();
  }, []);

  async function cargarVentasCliente(clienteId: number) {
    setCargandoVentas(true);

    const { data, error } = await supabase
      .from("ventas")
      .select(`
        id,
        precio_venta_usd,
        ganancia_usd,
        forma_pago,
        fecha,
        tiene_permuta,
        equipo:equipos (
          modelo
        )
      `)
      .eq("cliente_id", clienteId)
      .order("fecha", { ascending: false });

    if (error) {
      console.error(error);
      setVentasCliente([]);
      setCargandoVentas(false);
      return;
    }

    setVentasCliente((data as unknown as Venta[]) || []);
    setCargandoVentas(false);
  }

  function seleccionarCliente(cliente: Cliente) {
    setClienteSeleccionado(cliente);
    cargarVentasCliente(cliente.id);
  }

  function cerrarDetalle() {
    setClienteSeleccionado(null);
    setVentasCliente([]);
  }

  async function guardarCliente() {
    if (!nombre.trim()) {
      alert("Ingresá el nombre del cliente.");
      return;
    }

    setGuardando(true);

    const { error } = await supabase
      .from("clientes")
      .insert({
        nombre: nombre.trim(),
        telefono: telefono.trim() || null,
        email: email.trim() || null,
        documento: documento.trim() || null,
      });

    setGuardando(false);

    if (error) {
      console.error(error);
      alert("Error al guardar el cliente: " + error.message);
      return;
    }

    setNombre("");
    setTelefono("");
    setEmail("");
    setDocumento("");

    setMostrarFormulario(false);

    await cargarClientes();
  }

  function abrirEdicion(cliente: Cliente) {
    setEditId(cliente.id);
    setEditNombre(cliente.nombre || "");
    setEditTelefono(cliente.telefono || "");
    setEditEmail(cliente.email || "");
    setEditDocumento(cliente.documento || "");
    setEditando(true);
  }

  function cerrarEdicion() {
    setEditando(false);
    setEditId(null);
    setEditNombre("");
    setEditTelefono("");
    setEditEmail("");
    setEditDocumento("");
  }

  async function guardarEdicion() {
    if (!editId) return;

    if (!editNombre.trim()) {
      alert("Ingresá el nombre del cliente.");
      return;
    }

    setGuardando(true);

    const { error } = await supabase
      .from("clientes")
      .update({
        nombre: editNombre.trim(),
        telefono: editTelefono.trim() || null,
        email: editEmail.trim() || null,
        documento: editDocumento.trim() || null,
      })
      .eq("id", editId);

    setGuardando(false);

    if (error) {
      console.error(error);
      alert(
        "Error al actualizar el cliente: " +
          error.message
      );
      return;
    }

    await cargarClientes();

    if (
      clienteSeleccionado &&
      clienteSeleccionado.id === editId
    ) {
      setClienteSeleccionado({
        ...clienteSeleccionado,
        nombre: editNombre.trim(),
        telefono: editTelefono.trim() || null,
        email: editEmail.trim() || null,
        documento: editDocumento.trim() || null,
      });
    }

    cerrarEdicion();

    alert("Cliente actualizado correctamente.");
  }

  async function eliminarCliente(cliente: Cliente) {
    const confirmado = window.confirm(
      `¿Eliminar el cliente "${cliente.nombre}"?\n\n` +
        `Si este cliente tiene ventas asociadas, el sistema no permitirá eliminarlo.\n\n` +
        `Esta acción no se puede deshacer.`
    );

    if (!confirmado) return;

    setEliminandoCliente(cliente.id);

    const { error } = await supabase.rpc(
      "eliminar_cliente",
      {
        p_cliente_id: cliente.id,
      }
    );

    setEliminandoCliente(null);

    if (error) {
      console.error(error);

      alert(
        "No se pudo eliminar el cliente: " +
          error.message
      );

      return;
    }

    if (
      clienteSeleccionado?.id === cliente.id
    ) {
      cerrarDetalle();
    }

    await cargarClientes();

    alert("Cliente eliminado correctamente ✅");
  }

  const clientesFiltrados = clientes.filter((cliente) => {
    const texto = busqueda.toLowerCase();

    return (
      cliente.nombre.toLowerCase().includes(texto) ||
      (cliente.telefono || "")
        .toLowerCase()
        .includes(texto) ||
      (cliente.email || "")
        .toLowerCase()
        .includes(texto) ||
      (cliente.documento || "")
        .toLowerCase()
        .includes(texto)
    );
  });

  const totalClientes = clientes.length;

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl">

        {/* ENCABEZADO */}

        <div className="flex items-start justify-between gap-6">

          <div>
            <p className="text-sm font-medium text-gray-500">
              PERSONAS
            </p>

            <h1 className="mt-1 text-3xl font-bold text-gray-900">
              Clientes
            </h1>

            <p className="mt-2 text-gray-500">
              Administrá tus clientes y consultá su historial.
            </p>
          </div>

          <button
            onClick={() =>
              setMostrarFormulario(!mostrarFormulario)
            }
            className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Nuevo cliente
          </button>

        </div>

        {/* RESUMEN */}

        <div className="mt-8">

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

            <p className="text-sm text-gray-500">
              Clientes registrados
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {totalClientes}
            </p>

          </div>

        </div>

        {/* FORMULARIO */}

        {mostrarFormulario && (

          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

            <h2 className="text-lg font-semibold text-gray-900">
              Nuevo cliente
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Ingresá los datos básicos del cliente.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">

              <input
                value={nombre}
                onChange={(e) =>
                  setNombre(e.target.value)
                }
                placeholder="Nombre completo"
                className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
              />

              <input
                value={telefono}
                onChange={(e) =>
                  setTelefono(e.target.value)
                }
                placeholder="Teléfono"
                className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
              />

              <input
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="Email"
                type="email"
                className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
              />

              <input
                value={documento}
                onChange={(e) =>
                  setDocumento(e.target.value)
                }
                placeholder="DNI / Documento"
                className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
              />

            </div>

            <div className="mt-6 flex gap-3">

              <button
                onClick={guardarCliente}
                disabled={guardando}
                className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
              >
                {guardando
                  ? "Guardando..."
                  : "Guardar cliente"}
              </button>

              <button
                onClick={() =>
                  setMostrarFormulario(false)
                }
                className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium"
              >
                Cancelar
              </button>

            </div>

          </div>

        )}

        {/* BUSCADOR */}

        <div className="mt-8">

          <input
            value={busqueda}
            onChange={(e) =>
              setBusqueda(e.target.value)
            }
            placeholder="Buscar cliente por nombre, teléfono, email o DNI..."
            className="w-full rounded-xl border border-gray-300 bg-white px-5 py-4 outline-none focus:border-gray-900"
          />

        </div>

        {/* LISTA */}

        <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-200 px-6 py-5">

            <h2 className="font-semibold text-gray-900">
              Lista de clientes
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Consultá o administrá la información de cada cliente.
            </p>

          </div>

          {cargando ? (

            <div className="p-10 text-center text-gray-500">
              Cargando clientes...
            </div>

          ) : clientesFiltrados.length === 0 ? (

            <div className="p-10 text-center text-gray-500">
              No se encontraron clientes.
            </div>

          ) : (

            <div className="divide-y divide-gray-200">

              {clientesFiltrados.map((cliente) => (

                <div
                  key={cliente.id}
                  className="px-6 py-5 transition hover:bg-gray-50"
                >

                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                    <button
                      onClick={() =>
                        seleccionarCliente(cliente)
                      }
                      className="min-w-0 flex-1 text-left"
                    >

                      <p className="font-semibold text-gray-900">
                        {cliente.nombre}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">

                        {cliente.telefono && (
                          <span>
                            {cliente.telefono}
                          </span>
                        )}

                        {cliente.email && (
                          <span>
                            {cliente.email}
                          </span>
                        )}

                        {cliente.documento && (
                          <span>
                            DNI: {cliente.documento}
                          </span>
                        )}

                      </div>

                    </button>

                    <div className="flex shrink-0 flex-wrap gap-2">

                      <button
                        onClick={() =>
                          seleccionarCliente(cliente)
                        }
                        className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
                      >
                        Ver cliente
                      </button>

                      <button
                        onClick={() =>
                          abrirEdicion(cliente)
                        }
                        className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                      >
                        Editar
                      </button>

                      <button
                        onClick={() =>
                          eliminarCliente(cliente)
                        }
                        disabled={
                          eliminandoCliente ===
                          cliente.id
                        }
                        className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {eliminandoCliente ===
                        cliente.id
                          ? "Eliminando..."
                          : "Eliminar"}
                      </button>

                    </div>

                  </div>

                </div>

              ))}

            </div>

          )}

        </div>

        {/* MODAL EDITAR */}

        {editando && (

          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">

              <div className="flex items-center justify-between border-b border-gray-200 p-6">

                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Editar cliente
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Modificá los datos del cliente.
                  </p>
                </div>

                <button
                  onClick={cerrarEdicion}
                  className="rounded-lg px-3 py-2 text-xl text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                >
                  ✕
                </button>

              </div>

              <div className="p-6">

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Nombre completo
                    </label>

                    <input
                      value={editNombre}
                      onChange={(e) =>
                        setEditNombre(e.target.value)
                      }
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Teléfono
                    </label>

                    <input
                      value={editTelefono}
                      onChange={(e) =>
                        setEditTelefono(e.target.value)
                      }
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Email
                    </label>

                    <input
                      value={editEmail}
                      onChange={(e) =>
                        setEditEmail(e.target.value)
                      }
                      type="email"
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      DNI / Documento
                    </label>

                    <input
                      value={editDocumento}
                      onChange={(e) =>
                        setEditDocumento(e.target.value)
                      }
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
                    />
                  </div>

                </div>

                <div className="mt-6 flex justify-end gap-3">

                  <button
                    onClick={cerrarEdicion}
                    disabled={guardando}
                    className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>

                  <button
                    onClick={guardarEdicion}
                    disabled={guardando}
                    className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
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

        {/* DETALLE DEL CLIENTE */}

        {clienteSeleccionado && (

          <div className="fixed inset-0 z-50 bg-black/30 p-4">

            <div className="mx-auto mt-10 max-h-[85vh] max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">

              {/* CABECERA */}

              <div className="flex items-start justify-between border-b border-gray-200 p-6">

                <div>

                  <p className="text-sm text-gray-500">
                    CLIENTE
                  </p>

                  <h2 className="mt-1 text-2xl font-bold text-gray-900">
                    {clienteSeleccionado.nombre}
                  </h2>

                  <div className="mt-3 space-y-1 text-sm text-gray-500">

                    {clienteSeleccionado.telefono && (
                      <p>
                        Teléfono:{" "}
                        {clienteSeleccionado.telefono}
                      </p>
                    )}

                    {clienteSeleccionado.email && (
                      <p>
                        Email:{" "}
                        {clienteSeleccionado.email}
                      </p>
                    )}

                    {clienteSeleccionado.documento && (
                      <p>
                        DNI:{" "}
                        {clienteSeleccionado.documento}
                      </p>
                    )}

                  </div>

                </div>

                <button
                  onClick={cerrarDetalle}
                  className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                >
                  ✕
                </button>

              </div>

              {/* RESUMEN */}

              <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">

                <div className="rounded-xl bg-gray-50 p-5">

                  <p className="text-sm text-gray-500">
                    Operaciones
                  </p>

                  <p className="mt-2 text-2xl font-bold">
                    {ventasCliente.length}
                  </p>

                </div>

                <div className="rounded-xl bg-gray-50 p-5">

                  <p className="text-sm text-gray-500">
                    Total comprado
                  </p>

                  <p className="mt-2 text-2xl font-bold">
                    USD{" "}
                    {ventasCliente
                      .reduce(
                        (total, venta) =>
                          total +
                          Number(
                            venta.precio_venta_usd || 0
                          ),
                        0
                      )
                      .toLocaleString("en-US")}
                  </p>

                </div>

              </div>

              {/* HISTORIAL */}

              <div className="border-t border-gray-200">

                <div className="px-6 py-5">

                  <h3 className="font-semibold">
                    Historial de compras
                  </h3>

                </div>

                {cargandoVentas ? (

                  <div className="p-8 text-center text-gray-500">
                    Cargando historial...
                  </div>

                ) : ventasCliente.length === 0 ? (

                  <div className="p-8 text-center text-gray-500">
                    Este cliente todavía no tiene compras.
                  </div>

                ) : (

                  <div className="divide-y divide-gray-200">

                    {ventasCliente.map((venta) => (

                      <div
                        key={venta.id}
                        className="px-6 py-5"
                      >

                        <div className="flex items-center justify-between">

                          <div>

                            <div className="flex items-center gap-3">

                              <p className="font-semibold">
                                {venta.equipo?.modelo ||
                                  "Equipo"}
                              </p>

                              {venta.tiene_permuta && (

                                <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
                                  Permuta
                                </span>

                              )}

                            </div>

                            <p className="mt-1 text-sm text-gray-500">
                              {new Date(
                                venta.fecha
                              ).toLocaleString("es-AR")}
                            </p>

                          </div>

                          <div className="text-right">

                            <p className="font-semibold">
                              USD{" "}
                              {Number(
                                venta.precio_venta_usd
                              ).toLocaleString("en-US")}
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              {venta.forma_pago ||
                                "Sin especificar"}
                            </p>

                          </div>

                        </div>

                      </div>

                    ))}

                  </div>

                )}

              </div>

            </div>

          </div>

        )}

      </div>
    </div>
  );
}