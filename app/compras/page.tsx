"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Cuenta = {
  id: number;
  nombre: string;
  moneda: string;
  tipo: string;
  activa: boolean;
};

type Compra = {
  id: number;
  costo_usd: number;
  forma_pago: string | null;
  fecha: string;
  proveedor: {
    nombre: string;
  } | null;
  equipo: {
    modelo: string;
    imei: string | null;
  } | null;
};

function dinero(valor: number) {
  return Number(valor || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ComprasPage() {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [eliminandoCompra, setEliminandoCompra] =
    useState<number | null>(null);

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [proveedor, setProveedor] = useState("");
  const [modelo, setModelo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [imei, setImei] = useState("");
  const [estado, setEstado] = useState("usado");
  const [bateria, setBateria] = useState("");
  const [color, setColor] = useState("");
  const [costo, setCosto] = useState("");
  const [precioVenta, setPrecioVenta] = useState("");

  const [formaPago, setFormaPago] =
    useState("USD billete");

  const [cuentaId, setCuentaId] =
    useState("");

  const [monedaTransferencia, setMonedaTransferencia] =
    useState("USD");

  const [cotizacionUsd, setCotizacionUsd] =
    useState("");

  async function cargarDatos() {
    setCargando(true);

    const [comprasResult, cuentasResult] =
      await Promise.all([
        supabase
          .from("compras")
          .select(`
            id,
            costo_usd,
            forma_pago,
            fecha,
            proveedor:proveedores (
              nombre
            ),
            equipo:equipos (
              modelo,
              imei
            )
          `)
          .order("fecha", {
            ascending: false,
          }),

        supabase
          .from("cuentas_liquidez")
          .select("*")
          .eq("activa", true)
          .neq("tipo", "tarjeta")
          .order("id"),
      ]);

    if (comprasResult.error) {
      console.error(
        "Error cargando compras:",
        comprasResult.error
      );
    }

    if (cuentasResult.error) {
      console.error(
        "Error cargando cuentas:",
        cuentasResult.error
      );
    }

    setCompras(
      (comprasResult.data || []) as Compra[]
    );

    const cuentasCargadas =
      cuentasResult.data || [];

    setCuentas(cuentasCargadas);

    if (
      !cuentaId &&
      cuentasCargadas.length > 0
    ) {
      const cuentaDolares =
        cuentasCargadas.find(
          (cuenta) =>
            cuenta.nombre ===
            "Dólares billete"
        );

      if (cuentaDolares) {
        setCuentaId(
          String(cuentaDolares.id)
        );
      } else {
        setCuentaId(
          String(cuentasCargadas[0].id)
        );
      }
    }

    setCargando(false);
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  function seleccionarCuentaPorNombre(
    nombre: string
  ) {
    const cuenta = cuentas.find(
      (c) => c.nombre === nombre
    );

    if (cuenta) {
      setCuentaId(
        String(cuenta.id)
      );
    }
  }

  function seleccionarFormaPago(
    metodo: string
  ) {
    setFormaPago(metodo);

    if (metodo === "USD billete") {
      seleccionarCuentaPorNombre(
        "Dólares billete"
      );
    }

    if (metodo === "Efectivo ARS") {
      seleccionarCuentaPorNombre(
        "Efectivo ARS"
      );
    }

    if (metodo === "USDT") {
      seleccionarCuentaPorNombre(
        "USDT"
      );
    }

    if (metodo === "Transferencia") {
      if (
        monedaTransferencia === "ARS"
      ) {
        seleccionarCuentaPorNombre(
          "Pesos argentinos"
        );
      } else {
        seleccionarCuentaPorNombre(
          "Transferencias USD"
        );
      }
    }
  }

  function cambiarMonedaTransferencia(
    moneda: string
  ) {
    setMonedaTransferencia(
      moneda
    );

    if (moneda === "ARS") {
      seleccionarCuentaPorNombre(
        "Pesos argentinos"
      );
    } else {
      seleccionarCuentaPorNombre(
        "Transferencias USD"
      );
    }
  }

  function limpiarFormulario() {
    setProveedor("");
    setModelo("");
    setDescripcion("");
    setImei("");
    setEstado("usado");
    setBateria("");
    setColor("");
    setCosto("");
    setPrecioVenta("");

    setFormaPago(
      "USD billete"
    );

    setMonedaTransferencia(
      "USD"
    );

    setCotizacionUsd("");

    const cuentaDolares =
      cuentas.find(
        (c) =>
          c.nombre ===
          "Dólares billete"
      );

    if (cuentaDolares) {
      setCuentaId(
        String(cuentaDolares.id)
      );
    }
  }

  async function guardarCompra() {
    if (!proveedor.trim()) {
      alert(
        "Ingresá el proveedor."
      );
      return;
    }

    if (!modelo.trim()) {
      alert(
        "Ingresá el modelo del equipo."
      );
      return;
    }

    if (!costo || Number(costo) <= 0) {
      alert(
        "Ingresá un costo válido."
      );
      return;
    }

    if (!cuentaId) {
      alert(
        "Seleccioná de qué cuenta sale el dinero."
      );
      return;
    }

    const costoUsd =
      Number(costo);

    const cuentaSeleccionada =
      cuentas.find(
        (cuenta) =>
          cuenta.id ===
          Number(cuentaId)
      );

    if (!cuentaSeleccionada) {
      alert(
        "La cuenta seleccionada no existe."
      );
      return;
    }

    const esTransferencia =
      formaPago ===
      "Transferencia";

    const esArs =
      formaPago === "Efectivo ARS" ||
      (
        esTransferencia &&
        monedaTransferencia === "ARS"
      );

    const cotizacionNumero =
      Number(cotizacionUsd) || 0;

    if (
      esArs &&
      cotizacionNumero <= 0
    ) {
      alert(
        "Ingresá la cotización USD/ARS del momento."
      );
      return;
    }

    const monedaPago =
      esArs
        ? "ARS"
        : formaPago === "USDT"
        ? "USDT"
        : "USD";

    const montoOriginal =
      esArs
        ? costoUsd *
          cotizacionNumero
        : costoUsd;

    setGuardando(true);

    const { error } =
      await supabase.rpc(
        "registrar_compra",
        {
          p_proveedor_nombre:
            proveedor.trim(),

          p_modelo:
            modelo.trim(),

          p_descripcion:
            descripcion.trim(),

          p_imei:
            imei.trim(),

          p_estado:
            estado,

          p_bateria:
            bateria
              ? Number(bateria)
              : null,

          p_color:
            color.trim(),

          p_costo_usd:
            costoUsd,

          p_precio_venta_usd:
            precioVenta
              ? Number(precioVenta)
              : null,

          p_forma_pago:
            formaPago,

          p_cuenta_liquidez_id:
            Number(cuentaId),

          p_moneda_pago:
            monedaPago,

          p_monto_original:
            montoOriginal,

          p_cotizacion_usd:
            esArs
              ? cotizacionNumero
              : null,
        }
      );

    setGuardando(false);

    if (error) {
      console.error(error);

      alert(
        "Error al registrar la compra: " +
          error.message
      );

      return;
    }

    alert(
      "Compra registrada correctamente ✅"
    );

    limpiarFormulario();

    setMostrarFormulario(false);

    await cargarDatos();
  }

  async function eliminarCompra(compra: Compra) {
    const confirmado = window.confirm(
      `¿Eliminar la compra #${compra.id}?\n\n` +
        `Equipo: ${
          compra.equipo?.modelo || "Equipo"
        }\n` +
        `Costo: USD ${dinero(
          Number(compra.costo_usd || 0)
        )}\n\n` +
        `Se eliminará el equipo del stock y se revertirá el movimiento de liquidez.\n\n` +
        `Esta acción no se puede deshacer.`
    );

    if (!confirmado) return;

    setEliminandoCompra(compra.id);

    const { error } =
      await supabase.rpc(
        "eliminar_compra",
        {
          p_compra_id: compra.id,
        }
      );

    setEliminandoCompra(null);

    if (error) {
      console.error(
        "Error eliminando compra:",
        error
      );

      alert(
        "No se pudo eliminar la compra: " +
          error.message
      );

      return;
    }

    alert(
      "Compra eliminada correctamente ✅"
    );

    await cargarDatos();
  }

  const totalCompras =
    compras.reduce(
      (total, compra) =>
        total +
        Number(
          compra.costo_usd || 0
        ),
      0
    );

  const esEfectivoArs =
    formaPago === "Efectivo ARS";

  const esTransferenciaArs =
    formaPago === "Transferencia" &&
    monedaTransferencia === "ARS";

  const esPagoArs =
    esEfectivoArs ||
    esTransferenciaArs;

  const totalArs =
    (Number(costo) || 0) *
    (Number(cotizacionUsd) || 0);

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl">

        <div className="flex flex-wrap items-end justify-between gap-4">

          <div>
            <p className="text-sm font-medium text-gray-500">
              OPERACIONES
            </p>

            <h1 className="mt-1 text-3xl font-bold text-gray-900">
              Compras
            </h1>

            <p className="mt-2 text-gray-500">
              Compras de equipos y movimientos de stock.
            </p>
          </div>

          <button
            onClick={() =>
              setMostrarFormulario(
                !mostrarFormulario
              )
            }
            className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Nueva compra
          </button>

        </div>

        {mostrarFormulario && (
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">

            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Nueva compra
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                El equipo ingresará automáticamente al stock y el dinero se descontará de la cuenta seleccionada.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">

              <input
                value={proveedor}
                onChange={(e) =>
                  setProveedor(
                    e.target.value
                  )
                }
                placeholder="Proveedor"
                className="rounded-xl border border-gray-300 px-4 py-3"
              />

              <input
                value={modelo}
                onChange={(e) =>
                  setModelo(
                    e.target.value
                  )
                }
                placeholder="Modelo"
                className="rounded-xl border border-gray-300 px-4 py-3"
              />

              <input
                value={imei}
                onChange={(e) =>
                  setImei(
                    e.target.value
                  )
                }
                placeholder="IMEI"
                className="rounded-xl border border-gray-300 px-4 py-3"
              />

              <input
                value={color}
                onChange={(e) =>
                  setColor(
                    e.target.value
                  )
                }
                placeholder="Color"
                className="rounded-xl border border-gray-300 px-4 py-3"
              />

              <select
                value={estado}
                onChange={(e) =>
                  setEstado(
                    e.target.value
                  )
                }
                className="rounded-xl border border-gray-300 px-4 py-3"
              >
                <option value="nuevo">
                  Nuevo
                </option>

                <option value="usado">
                  Usado
                </option>
              </select>

              <input
                value={bateria}
                onChange={(e) =>
                  setBateria(
                    e.target.value
                  )
                }
                type="number"
                min="0"
                max="100"
                placeholder="Batería %"
                className="rounded-xl border border-gray-300 px-4 py-3"
              />

              <input
                value={costo}
                onChange={(e) =>
                  setCosto(
                    e.target.value
                  )
                }
                type="number"
                min="0"
                step="0.01"
                placeholder="Costo USD"
                className="rounded-xl border border-gray-300 px-4 py-3"
              />

              <input
                value={precioVenta}
                onChange={(e) =>
                  setPrecioVenta(
                    e.target.value
                  )
                }
                type="number"
                min="0"
                step="0.01"
                placeholder="Precio de venta USD"
                className="rounded-xl border border-gray-300 px-4 py-3"
              />

              <textarea
                value={descripcion}
                onChange={(e) =>
                  setDescripcion(
                    e.target.value
                  )
                }
                placeholder="Descripción / observaciones"
                rows={3}
                className="rounded-xl border border-gray-300 px-4 py-3 md:col-span-2"
              />

            </div>

            <div className="mt-8">

              <h3 className="font-semibold text-gray-900">
                ¿Cómo se pagó la compra?
              </h3>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">

                {[
                  "USD billete",
                  "Efectivo ARS",
                  "USDT",
                  "Transferencia",
                ].map(
                  (metodo) => {

                    const activo =
                      formaPago ===
                      metodo;

                    return (
                      <button
                        key={metodo}
                        type="button"
                        onClick={() =>
                          seleccionarFormaPago(
                            metodo
                          )
                        }
                        className={`rounded-xl border p-4 text-left transition ${
                          activo
                            ? "border-gray-900 bg-gray-900 text-white"
                            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <p className="font-medium">
                          {metodo}
                        </p>

                        <p
                          className={`mt-1 text-xs ${
                            activo
                              ? "text-gray-300"
                              : "text-gray-500"
                          }`}
                        >
                          {metodo ===
                          "USD billete"
                            ? "Efectivo en dólares"
                            : metodo ===
                              "Efectivo ARS"
                            ? "Billetes en pesos"
                            : metodo ===
                              "USDT"
                            ? "Cripto"
                            : "Transferencia bancaria"}
                        </p>
                      </button>
                    );
                  }
                )}

              </div>
            </div>

            {formaPago ===
              "Transferencia" && (
              <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-5">

                <p className="font-semibold text-gray-900">
                  Moneda de la transferencia
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  Elegí en qué moneda se realiza realmente el pago.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">

                  <button
                    type="button"
                    onClick={() =>
                      cambiarMonedaTransferencia(
                        "USD"
                      )
                    }
                    className={`rounded-xl border p-4 text-left transition ${
                      monedaTransferencia ===
                      "USD"
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <p className="font-medium">
                      Transferencia USD
                    </p>

                    <p className="mt-1 text-xs opacity-70">
                      Sale de Transferencias USD
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      cambiarMonedaTransferencia(
                        "ARS"
                      )
                    }
                    className={`rounded-xl border p-4 text-left transition ${
                      monedaTransferencia ===
                      "ARS"
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <p className="font-medium">
                      Transferencia ARS
                    </p>

                    <p className="mt-1 text-xs opacity-70">
                      Sale de Pesos argentinos
                    </p>
                  </button>

                </div>
              </div>
            )}

            {esPagoArs && (
              <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5">

                <p className="font-semibold text-blue-950">
                  {esEfectivoArs
                    ? "Pago en efectivo ARS"
                    : "Pago por transferencia ARS"}
                </p>

                <p className="mt-1 text-sm text-blue-700">
                  La cotización queda congelada para esta compra.
                </p>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">

                  <div>

                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Cotización USD/ARS
                    </label>

                    <input
                      value={
                        cotizacionUsd
                      }
                      onChange={(e) =>
                        setCotizacionUsd(
                          e.target.value
                        )
                      }
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Ej: 1500"
                      className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3"
                    />

                  </div>

                  <div className="rounded-xl bg-white p-4">

                    <p className="text-xs text-gray-500">
                      Total a pagar
                    </p>

                    <p className="mt-1 text-2xl font-bold text-gray-900">
                      ARS $
                      {dinero(totalArs)}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      USD{" "}
                      {dinero(
                        Number(costo) ||
                          0
                      )}{" "}
                      ×{" "}
                      {dinero(
                        Number(
                          cotizacionUsd
                        ) || 0
                      )}
                    </p>

                  </div>

                </div>

              </div>
            )}

            <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-5">

              <p className="text-sm text-gray-500">
                Cuenta que se utilizará
              </p>

              <p className="mt-1 font-semibold text-gray-900">
                {cuentas.find(
                  (c) =>
                    c.id ===
                    Number(cuentaId)
                )?.nombre ||
                  "Seleccioná una cuenta"}
              </p>

              {costo && (
                <div className="mt-3">

                  {esPagoArs ? (
                    <p className="text-sm text-red-600">
                      Saldrán ARS{" "}
                      {dinero(totalArs)}{" "}
                      de esta cuenta.
                    </p>
                  ) : (
                    <p className="text-sm text-red-600">
                      Saldrán{" "}
                      {formaPago ===
                      "USDT"
                        ? "USDT"
                        : "USD"}{" "}
                      {dinero(
                        Number(costo)
                      )}{" "}
                      de esta cuenta.
                    </p>
                  )}

                </div>
              )}

            </div>

            <div className="mt-6 rounded-xl bg-gray-50 p-5">

              <p className="text-sm font-semibold text-gray-900">
                Resumen de la compra
              </p>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">

                <div>
                  <p className="text-xs text-gray-500">
                    Costo económico
                  </p>

                  <p className="mt-1 font-semibold">
                    USD{" "}
                    {dinero(
                      Number(costo) ||
                        0
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Forma de pago
                  </p>

                  <p className="mt-1 font-semibold">
                    {formaPago}

                    {formaPago ===
                      "Transferencia" &&
                      ` ${monedaTransferencia}`}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Cuenta
                  </p>

                  <p className="mt-1 font-semibold">
                    {cuentas.find(
                      (c) =>
                        c.id ===
                        Number(
                          cuentaId
                        )
                    )?.nombre ||
                      "Sin seleccionar"}
                  </p>
                </div>

                {esPagoArs && (
                  <>
                    <div>
                      <p className="text-xs text-gray-500">
                        Cotización
                      </p>

                      <p className="mt-1 font-semibold">
                        $
                        {dinero(
                          Number(
                            cotizacionUsd
                          ) || 0
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">
                        Pago real
                      </p>

                      <p className="mt-1 text-lg font-bold">
                        ARS $
                        {dinero(
                          totalArs
                        )}
                      </p>
                    </div>
                  </>
                )}

              </div>

            </div>

            <div className="mt-6 flex justify-end gap-3">

              <button
                onClick={() => {
                  limpiarFormulario();
                  setMostrarFormulario(
                    false
                  );
                }}
                className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700"
              >
                Cancelar
              </button>

              <button
                onClick={guardarCompra}
                disabled={guardando}
                className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
              >
                {guardando
                  ? "Registrando..."
                  : "Registrar compra"}
              </button>

            </div>

          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

            <p className="text-sm text-gray-500">
              Compras realizadas
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {compras.length}
            </p>

          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

            <p className="text-sm text-gray-500">
              Total invertido
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
              USD{" "}
              {dinero(totalCompras)}
            </p>

          </div>

        </div>

        <div className="mt-8 rounded-2xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-200 px-6 py-5">

            <h2 className="font-semibold text-gray-900">
              Historial de compras
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Todas las compras registradas.
            </p>

          </div>

          {cargando ? (
            <div className="p-10 text-center text-gray-500">
              Cargando compras...
            </div>
          ) : compras.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              Todavía no hay compras registradas.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">

              {compras.map(
                (compra) => (
                  <div
                    key={compra.id}
                    className="px-6 py-6"
                  >

                    <div className="flex flex-wrap items-start justify-between gap-4">

                      <div>

                        <p className="text-lg font-semibold text-gray-900">
                          {compra.equipo
                            ?.modelo ||
                            "Equipo"}
                        </p>

                        <p className="mt-2 text-sm text-gray-600">
                          Proveedor:{" "}
                          {compra.proveedor
                            ?.nombre ||
                            "Sin proveedor"}
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          {new Date(
                            compra.fecha
                          ).toLocaleString(
                            "es-AR"
                          )}
                        </p>

                      </div>

                      <div className="text-right">

                        <p className="text-lg font-semibold text-gray-900">
                          USD{" "}
                          {dinero(
                            Number(
                              compra.costo_usd
                            )
                          )}
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          {compra.forma_pago ||
                            "Sin especificar"}
                        </p>

                      </div>

                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">

                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-500">

                        {compra.equipo
                          ?.imei && (
                          <span>
                            IMEI:{" "}
                            {
                              compra
                                .equipo
                                .imei
                            }
                          </span>
                        )}

                        <span>
                          Compra #{compra.id}
                        </span>

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          eliminarCompra(
                            compra
                          )
                        }
                        disabled={
                          eliminandoCompra ===
                          compra.id
                        }
                        className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {eliminandoCompra ===
                        compra.id
                          ? "Eliminando..."
                          : "Eliminar compra"}
                      </button>

                    </div>

                  </div>
                )
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
}