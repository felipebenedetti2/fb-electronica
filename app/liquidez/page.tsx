"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Cuenta = {
  id: number;
  nombre: string;
  moneda: string;
  tipo: string;
  activa: boolean;
};

type Movimiento = {
  id: number;
  tipo: string;
  concepto: string;
  monto_usd: number;
  referencia: string | null;
  fecha: string;
  cuenta_id: number | null;
  moneda: string | null;
  monto_original: number | null;
  cotizacion_usd: number | null;
};

type Equipo = {
  id: number;
  modelo: string;
  costo_usd: number;
  estado_stock: string;
};

type PagoTarjeta = {
  id: number;
  monto_usd: number;
  cuotas: number;
  comision_usd: number;
  monto_neto_usd: number;
  estado: string;
  fecha_venta: string;
  fecha_acreditacion: string | null;
};

function dinero(valor: number) {
  return Number(valor || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function LiquidezPage() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [pagosTarjeta, setPagosTarjeta] = useState<PagoTarjeta[]>([]);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [tipoMovimiento, setTipoMovimiento] =
    useState("ingreso");

  const [cuentaId, setCuentaId] = useState("");

  const [concepto, setConcepto] = useState("");

  const [monto, setMonto] = useState("");

  const [cotizacionUsd, setCotizacionUsd] =
    useState("");

  const [referencia, setReferencia] =
    useState("");

  // ==========================================
  // CARGAR DATOS
  // ==========================================

  async function cargarDatos() {
    setCargando(true);

    const [
      cuentasResult,
      movimientosResult,
      equiposResult,
      pagosTarjetaResult,
    ] = await Promise.all([
      supabase
        .from("cuentas_liquidez")
        .select("*")
        .eq("activa", true)
        .order("id"),

      supabase
        .from("movimientos")
        .select("*")
        .order("fecha", {
          ascending: false,
        }),

      supabase
        .from("equipos")
        .select(
          "id, modelo, costo_usd, estado_stock"
        )
        .eq(
          "estado_stock",
          "disponible"
        ),

      supabase
        .from("pagos_tarjeta")
        .select("*")
        .eq(
          "estado",
          "pendiente"
        )
        .order("fecha_venta", {
          ascending: false,
        }),
    ]);

    if (cuentasResult.error) {
      console.error(
        "Error cuentas:",
        cuentasResult.error
      );
    }

    if (movimientosResult.error) {
      console.error(
        "Error movimientos:",
        movimientosResult.error
      );
    }

    if (equiposResult.error) {
      console.error(
        "Error equipos:",
        equiposResult.error
      );
    }

    if (pagosTarjetaResult.error) {
      console.error(
        "Error tarjetas:",
        pagosTarjetaResult.error
      );
    }

    const cuentasCargadas =
      (cuentasResult.data ||
        []) as Cuenta[];

    setCuentas(cuentasCargadas);

    setMovimientos(
      (movimientosResult.data ||
        []) as Movimiento[]
    );

    setEquipos(
      (equiposResult.data ||
        []) as Equipo[]
    );

    setPagosTarjeta(
      (pagosTarjetaResult.data ||
        []) as PagoTarjeta[]
    );

    if (
      !cuentaId &&
      cuentasCargadas.length > 0
    ) {
      const cuentaInicial =
        cuentasCargadas.find(
          (cuenta) =>
            cuenta.tipo !== "tarjeta"
        ) ||
        cuentasCargadas[0];

      setCuentaId(
        String(cuentaInicial.id)
      );
    }

    setCargando(false);
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  // ==========================================
  // CUENTA SELECCIONADA
  // ==========================================

  const cuentaSeleccionada =
    useMemo(
      () =>
        cuentas.find(
          (cuenta) =>
            cuenta.id ===
            Number(cuentaId)
        ),
      [cuentas, cuentaId]
    );

  const cuentaEsARS =
    cuentaSeleccionada?.moneda ===
    "ARS";

  // ==========================================
  // GUARDAR MOVIMIENTO MANUAL
  // ==========================================

  async function guardarMovimiento() {
    if (!cuentaId) {
      alert(
        "Seleccioná una cuenta."
      );
      return;
    }

    if (!concepto.trim()) {
      alert(
        "Ingresá un concepto."
      );
      return;
    }

    const montoNumero =
      Number(monto);

    if (
      !montoNumero ||
      montoNumero <= 0
    ) {
      alert(
        "Ingresá un monto válido."
      );
      return;
    }

    if (!cuentaSeleccionada) {
      alert(
        "La cuenta seleccionada no existe."
      );
      return;
    }

    if (
      cuentaSeleccionada.tipo ===
      "tarjeta"
    ) {
      alert(
        "La cuenta de tarjetas pendientes no se puede utilizar para movimientos manuales."
      );
      return;
    }

    const cotizacionNumero =
      Number(cotizacionUsd);

    if (
      cuentaSeleccionada.moneda ===
        "ARS" &&
      (!cotizacionNumero ||
        cotizacionNumero <= 0)
    ) {
      alert(
        "Para un movimiento en ARS tenés que ingresar la cotización USD/ARS del momento."
      );
      return;
    }

    setGuardando(true);

    let montoUsd = 0;

    if (
      cuentaSeleccionada.moneda ===
      "ARS"
    ) {
      montoUsd =
        montoNumero /
        cotizacionNumero;
    } else {
      montoUsd =
        montoNumero;
    }

    const { error } =
      await supabase
        .from("movimientos")
        .insert({
          tipo: tipoMovimiento,

          concepto:
            concepto.trim(),

          monto_usd:
            montoUsd,

          monto_original:
            montoNumero,

          moneda:
            cuentaSeleccionada.moneda,

          cotizacion_usd:
            cuentaSeleccionada.moneda ===
            "ARS"
              ? cotizacionNumero
              : null,

          cuenta_id:
            Number(cuentaId),

          referencia:
            referencia.trim() ||
            null,
        });

    setGuardando(false);

    if (error) {
      console.error(error);

      alert(
        "Error al guardar el movimiento: " +
          error.message
      );

      return;
    }

    alert(
      "Movimiento registrado correctamente ✅"
    );

    setConcepto("");
    setMonto("");
    setCotizacionUsd("");
    setReferencia("");
    setTipoMovimiento("ingreso");
    setMostrarFormulario(false);

    await cargarDatos();
  }

  // ==========================================
  // VALOR USD DE CADA MOVIMIENTO
  // ==========================================

  function movimientoEnUsd(
    movimiento: Movimiento
  ) {
    const montoOriginal =
      Number(
        movimiento.monto_original ??
          movimiento.monto_usd ??
          0
      );

    const moneda =
      movimiento.moneda;

    if (moneda === "ARS") {
      const cotizacion =
        Number(
          movimiento.cotizacion_usd ||
            0
        );

      if (
        cotizacion > 0
      ) {
        return (
          montoOriginal /
          cotizacion
        );
      }

      return Number(
        movimiento.monto_usd || 0
      );
    }

    return montoOriginal;
  }

  // ==========================================
  // VALOR ORIGINAL DE CADA MOVIMIENTO
  // ==========================================

  function movimientoOriginal(
    movimiento: Movimiento
  ) {
    return Number(
      movimiento.monto_original ??
        movimiento.monto_usd ??
        0
    );
  }

  // ==========================================
  // SALDO ORIGINAL DE CUENTA
  // ==========================================

  function saldoCuentaOriginal(
    id: number
  ) {
    return movimientos
      .filter(
        (movimiento) =>
          movimiento.cuenta_id ===
          id
      )
      .reduce(
        (
          total,
          movimiento
        ) => {
          const monto =
            movimientoOriginal(
              movimiento
            );

          if (
            movimiento.tipo ===
            "ingreso"
          ) {
            return total + monto;
          }

          return total - monto;
        },
        0
      );
  }

  // ==========================================
  // SALDO USD DE CUENTA
  // ==========================================

  function saldoCuentaUsd(
    id: number
  ) {
    return movimientos
      .filter(
        (movimiento) =>
          movimiento.cuenta_id ===
          id
      )
      .reduce(
        (
          total,
          movimiento
        ) => {
          const monto =
            movimientoEnUsd(
              movimiento
            );

          if (
            movimiento.tipo ===
            "ingreso"
          ) {
            return total + monto;
          }

          return total - monto;
        },
        0
      );
  }

  // ==========================================
  // CUENTAS CON SALDO
  // ==========================================

  const cuentasConSaldo =
    cuentas.map((cuenta) => ({
      ...cuenta,

      saldoOriginal:
        saldoCuentaOriginal(
          cuenta.id
        ),

      saldoUsd:
        saldoCuentaUsd(
          cuenta.id
        ),
    }));

  // ==========================================
  // LIQUIDEZ DISPONIBLE USD
  // ==========================================

  const liquidezDisponible =
    cuentasConSaldo
      .filter(
        (cuenta) =>
          cuenta.tipo !==
          "tarjeta"
      )
      .reduce(
        (
          total,
          cuenta
        ) =>
          total +
          cuenta.saldoUsd,
        0
      );

  // ==========================================
  // TARJETAS PENDIENTES
  // ==========================================

  const tarjetasPendientes =
    pagosTarjeta.reduce(
      (
        total,
        pago
      ) =>
        total +
        Number(
          pago.monto_neto_usd ||
            0
        ),
      0
    );

  // ==========================================
  // STOCK
  // ==========================================

  const valorStock =
    equipos.reduce(
      (
        total,
        equipo
      ) =>
        total +
        Number(
          equipo.costo_usd ||
            0
        ),
      0
    );

  // ==========================================
  // PATRIMONIO
  // ==========================================

  const patrimonio =
    liquidezDisponible +
    valorStock +
    tarjetasPendientes;

  // ==========================================
  // INGRESOS / EGRESOS
  // ==========================================

  const ingresos =
    movimientos
      .filter(
        (movimiento) =>
          movimiento.tipo ===
          "ingreso"
      )
      .reduce(
        (
          total,
          movimiento
        ) =>
          total +
          movimientoEnUsd(
            movimiento
          ),
        0
      );

  const egresos =
    movimientos
      .filter(
        (movimiento) =>
          movimiento.tipo ===
          "egreso"
      )
      .reduce(
        (
          total,
          movimiento
        ) =>
          total +
          movimientoEnUsd(
            movimiento
          ),
        0
      );

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}

        <div className="flex items-start justify-between gap-6">

          <div>
            <p className="text-sm font-medium text-gray-500">
              FINANZAS
            </p>

            <h1 className="mt-1 text-3xl font-bold text-gray-900">
              Liquidez
            </h1>

            <p className="mt-2 text-gray-500">
              Dinero disponible, cuentas, stock y patrimonio.
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
            + Registrar movimiento
          </button>

        </div>

        {/* ========================================== */}
        {/* FORMULARIO */}
        {/* ========================================== */}

        {mostrarFormulario && (
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">

            <h2 className="text-xl font-semibold text-gray-900">
              Nuevo movimiento
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Registrá un ingreso o egreso y elegí dónde se encuentra el dinero.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">

              {/* TIPO */}

              <select
                value={
                  tipoMovimiento
                }
                onChange={(e) =>
                  setTipoMovimiento(
                    e.target.value
                  )
                }
                className="rounded-xl border border-gray-300 px-4 py-3"
              >
                <option value="ingreso">
                  Ingreso de dinero
                </option>

                <option value="egreso">
                  Egreso de dinero
                </option>
              </select>

              {/* CUENTA */}

              <select
                value={cuentaId}
                onChange={(e) => {
                  setCuentaId(
                    e.target.value
                  );
                  setCotizacionUsd(
                    ""
                  );
                }}
                className="rounded-xl border border-gray-300 px-4 py-3"
              >
                <option value="">
                  Seleccionar cuenta
                </option>

                {cuentas
                  .filter(
                    (cuenta) =>
                      cuenta.tipo !==
                      "tarjeta"
                  )
                  .map(
                    (cuenta) => (
                      <option
                        key={
                          cuenta.id
                        }
                        value={
                          cuenta.id
                        }
                      >
                        {
                          cuenta.nombre
                        }{" "}
                        —{" "}
                        {
                          cuenta.moneda
                        }
                      </option>
                    )
                  )}

              </select>

              {/* MONTO */}

              <input
                value={monto}
                onChange={(e) =>
                  setMonto(
                    e.target.value
                  )
                }
                type="number"
                min="0"
                step="0.01"
                placeholder={
                  cuentaEsARS
                    ? "Monto en ARS"
                    : "Monto"
                }
                className="rounded-xl border border-gray-300 px-4 py-3"
              />

              {/* CONCEPTO */}

              <input
                value={concepto}
                onChange={(e) =>
                  setConcepto(
                    e.target.value
                  )
                }
                placeholder="Concepto — Ej: Capital inicial"
                className="rounded-xl border border-gray-300 px-4 py-3"
              />

              {/* COTIZACIÓN ARS */}

              {cuentaEsARS && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 md:col-span-2">

                  <label className="block text-sm font-medium text-blue-900">
                    Cotización USD/ARS del momento
                  </label>

                  <p className="mt-1 text-xs text-blue-700">
                    Esta cotización queda congelada en este movimiento.
                  </p>

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
                    className="mt-3 w-full rounded-xl border border-blue-200 bg-white px-4 py-3"
                  />

                  {Number(
                    monto
                  ) > 0 &&
                    Number(
                      cotizacionUsd
                    ) > 0 && (
                      <div className="mt-3 rounded-lg bg-white p-3">

                        <p className="text-xs text-gray-500">
                          Equivalente USD registrado
                        </p>

                        <p className="mt-1 font-bold text-gray-900">
                          USD{" "}
                          {dinero(
                            Number(
                              monto
                            ) /
                              Number(
                                cotizacionUsd
                              )
                          )}
                        </p>

                      </div>
                    )}

                </div>
              )}

              {/* REFERENCIA */}

              <input
                value={
                  referencia
                }
                onChange={(e) =>
                  setReferencia(
                    e.target.value
                  )
                }
                placeholder="Referencia / observación"
                className="rounded-xl border border-gray-300 px-4 py-3 md:col-span-2"
              />

            </div>

            <div className="mt-6 flex justify-end gap-3">

              <button
                onClick={() =>
                  setMostrarFormulario(
                    false
                  )
                }
                className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700"
              >
                Cancelar
              </button>

              <button
                onClick={
                  guardarMovimiento
                }
                disabled={
                  guardando
                }
                className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
              >
                {guardando
                  ? "Guardando..."
                  : "Guardar movimiento"}
              </button>

            </div>

          </div>
        )}

        {/* ========================================== */}
        {/* RESUMEN */}
        {/* ========================================== */}

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">

          {/* LIQUIDEZ */}

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

            <p className="text-sm text-gray-500">
              Liquidez disponible
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              USD{" "}
              {dinero(
                liquidezDisponible
              )}
            </p>

            <p className="mt-2 text-xs text-gray-400">
              Equivalente USD histórico de las cuentas disponibles
            </p>

          </div>

          {/* STOCK */}

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

            <p className="text-sm text-gray-500">
              Dinero en stock
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              USD{" "}
              {dinero(
                valorStock
              )}
            </p>

            <p className="mt-2 text-xs text-gray-400">
              Costo de equipos disponibles
            </p>

          </div>

          {/* TARJETAS */}

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

            <p className="text-sm text-gray-500">
              Tarjetas pendientes
            </p>

            <p className="mt-2 text-3xl font-bold text-amber-600">
              USD{" "}
              {dinero(
                tarjetasPendientes
              )}
            </p>

            <p className="mt-2 text-xs text-gray-400">
              Neto pendiente de acreditación
            </p>

          </div>

          {/* PATRIMONIO */}

          <div className="rounded-2xl bg-gray-900 p-6 shadow-sm">

            <p className="text-sm text-gray-300">
              Patrimonio total
            </p>

            <p className="mt-2 text-3xl font-bold text-white">
              USD{" "}
              {dinero(
                patrimonio
              )}
            </p>

            <p className="mt-2 text-xs text-gray-400">
              Liquidez + stock + tarjetas pendientes
            </p>

          </div>

        </div>

        {/* ========================================== */}
        {/* DINERO POR CUENTA */}
        {/* ========================================== */}

        <div className="mt-8">

          <div className="mb-4">

            <h2 className="text-xl font-semibold text-gray-900">
              Dinero por cuenta
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Cada cuenta mantiene su moneda original y muestra también su equivalente USD.
            </p>

          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">

            {cuentasConSaldo
              .filter(
                (cuenta) =>
                  cuenta.tipo !==
                  "tarjeta"
              )
              .map(
                (cuenta) => (
                  <div
                    key={
                      cuenta.id
                    }
                    className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
                  >

                    <div className="flex items-start justify-between gap-4">

                      <div>

                        <p className="font-semibold text-gray-900">
                          {
                            cuenta.nombre
                          }
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {
                            cuenta.moneda
                          }
                        </p>

                      </div>

                    </div>

                    {/* SALDO ORIGINAL */}

                    <p className="mt-5 text-2xl font-bold text-gray-900">

                      {cuenta.moneda ===
                      "USD"
                        ? "USD "
                        : cuenta.moneda ===
                          "USDT"
                        ? "₮ "
                        : "ARS $"}

                      {dinero(
                        cuenta.saldoOriginal
                      )}

                    </p>

                    {/* EQUIVALENTE USD */}

                    <div className="mt-4 rounded-xl bg-gray-50 p-4">

                      <p className="text-xs text-gray-500">
                        Equivalente USD
                      </p>

                      <p className="mt-1 font-semibold text-gray-900">
                        USD{" "}
                        {dinero(
                          cuenta.saldoUsd
                        )}
                      </p>

                    </div>

                    {/* INFO ARS */}

                    {cuenta.moneda ===
                      "ARS" && (
                      <p className="mt-3 text-xs text-gray-400">
                        Calculado utilizando las cotizaciones congeladas de cada movimiento.
                      </p>
                    )}

                  </div>
                )
              )}

          </div>

        </div>

        {/* ========================================== */}
        {/* TARJETAS */}
        {/* ========================================== */}

        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6">

          <div className="flex flex-wrap items-center justify-between gap-4">

            <div>

              <h2 className="font-semibold text-amber-900">
                Tarjetas pendientes de acreditación
              </h2>

              <p className="mt-1 text-sm text-amber-700">
                Dinero que ya vendiste pero todavía no está disponible.
              </p>

            </div>

            <p className="text-2xl font-bold text-amber-900">
              USD{" "}
              {dinero(
                tarjetasPendientes
              )}
            </p>

          </div>

          {pagosTarjeta.length >
            0 && (
            <div className="mt-5 space-y-3">

              {pagosTarjeta.map(
                (pago) => (
                  <div
                    key={
                      pago.id
                    }
                    className="rounded-xl border border-amber-200 bg-white p-4"
                  >

                    <div className="flex flex-wrap items-center justify-between gap-4">

                      <div>

                        <p className="font-medium text-gray-900">
                          Tarjeta #
                          {
                            pago.id
                          }
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          {
                            pago.cuotas
                          }{" "}
                          {pago.cuotas ===
                          1
                            ? "cuota"
                            : "cuotas"}
                        </p>

                        {pago.fecha_acreditacion && (
                          <p className="mt-1 text-xs text-gray-400">
                            Acreditación:{" "}
                            {new Date(
                              pago.fecha_acreditacion
                            ).toLocaleDateString(
                              "es-AR"
                            )}
                          </p>
                        )}

                      </div>

                      <div className="text-right">

                        <p className="font-semibold text-gray-900">
                          USD{" "}
                          {dinero(
                            pago.monto_neto_usd
                          )}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          Comisión: USD{" "}
                          {dinero(
                            pago.comision_usd
                          )}
                        </p>

                      </div>

                    </div>

                  </div>
                )
              )}

            </div>
          )}

        </div>

        {/* ========================================== */}
        {/* INGRESOS / EGRESOS */}
        {/* ========================================== */}

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

            <p className="text-sm text-gray-500">
              Total de ingresos
            </p>

            <p className="mt-2 text-2xl font-bold text-green-600">
              +USD{" "}
              {dinero(
                ingresos
              )}
            </p>

            <p className="mt-2 text-xs text-gray-400">
              Convertidos según la cotización histórica de cada movimiento ARS.
            </p>

          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

            <p className="text-sm text-gray-500">
              Total de egresos
            </p>

            <p className="mt-2 text-2xl font-bold text-red-600">
              -USD{" "}
              {dinero(
                egresos
              )}
            </p>

            <p className="mt-2 text-xs text-gray-400">
              Convertidos según la cotización histórica de cada movimiento ARS.
            </p>

          </div>

        </div>

        {/* ========================================== */}
        {/* MOVIMIENTOS */}
        {/* ========================================== */}

        <div className="mt-8 rounded-2xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-200 px-6 py-5">

            <h2 className="font-semibold text-gray-900">
              Movimientos
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Historial de ingresos y egresos.
            </p>

          </div>

          {cargando ? (
            <div className="p-10 text-center text-gray-500">
              Cargando movimientos...
            </div>
          ) : movimientos.length ===
            0 ? (
            <div className="p-10 text-center text-gray-500">
              Todavía no hay movimientos.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">

              {movimientos.map(
                (movimiento) => {

                  const cuenta =
                    cuentas.find(
                      (c) =>
                        c.id ===
                        movimiento.cuenta_id
                    );

                  const valorOriginal =
                    movimientoOriginal(
                      movimiento
                    );

                  const valorUsd =
                    movimientoEnUsd(
                      movimiento
                    );

                  return (
                    <div
                      key={
                        movimiento.id
                      }
                      className="flex flex-wrap items-center justify-between gap-4 px-6 py-5"
                    >

                      <div>

                        <p className="font-semibold text-gray-900">
                          {
                            movimiento.concepto
                          }
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          {new Date(
                            movimiento.fecha
                          ).toLocaleString(
                            "es-AR"
                          )}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">

                          {cuenta && (
                            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                              {
                                cuenta.nombre
                              }
                            </span>
                          )}

                          {movimiento.moneda && (
                            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                              {
                                movimiento.moneda
                              }
                            </span>
                          )}

                          {movimiento.referencia && (
                            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                              {
                                movimiento.referencia
                              }
                            </span>
                          )}

                        </div>

                      </div>

                      <div className="text-right">

                        {/* VALOR ORIGINAL */}

                        <p
                          className={`font-semibold ${
                            movimiento.tipo ===
                            "ingreso"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >

                          {movimiento.tipo ===
                          "ingreso"
                            ? "+"
                            : "-"}{" "}

                          {movimiento.moneda ===
                          "ARS"
                            ? "ARS $"
                            : movimiento.moneda ===
                              "USDT"
                            ? "₮"
                            : "USD "}

                          {dinero(
                            valorOriginal
                          )}

                        </p>

                        {/* USD */}

                        {movimiento.moneda !==
                          "USD" && (
                          <p className="mt-1 text-xs text-gray-500">
                            Equiv. USD{" "}
                            {dinero(
                              valorUsd
                            )}
                          </p>
                        )}

                        {/* COTIZACIÓN */}

                        {movimiento.moneda ===
                          "ARS" &&
                          movimiento.cotizacion_usd && (
                            <p className="mt-1 text-xs text-gray-400">
                              Cotización: $
                              {dinero(
                                Number(
                                  movimiento.cotizacion_usd
                                )
                              )}
                            </p>
                          )}

                      </div>

                    </div>
                  );
                }
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
}