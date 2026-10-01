"use client";

import { useEffect, useMemo, useState } from "react";
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
  estado_stock: string;
};

type Cuenta = {
  id: number;
  nombre: string;
  moneda: string;
  tipo: string;
  activa: boolean;
};

type TipoOperacion =
  | "venta"
  | "permuta"
  | "ingreso"
  | "gasto"
  | "dinero";

type FormaPago =
  | "USD billete"
  | "Efectivo ARS"
  | "USDT"
  | "Transferencia USD"
  | "Transferencia ARS"
  | "Tarjeta débito"
  | "Tarjeta crédito";

function dinero(valor: number) {
  return Number(valor || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function OperacionesPage() {
  const [tipoOperacion, setTipoOperacion] =
    useState<TipoOperacion>("venta");

  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // =========================
  // VENTA / PERMUTA
  // =========================

  const [cliente, setCliente] = useState("");
  const [equipoId, setEquipoId] = useState("");
  const [precioVenta, setPrecioVenta] = useState("");

  const [tienePermuta, setTienePermuta] =
    useState<boolean | null>(null);

  const [equipoRecibidoModelo, setEquipoRecibidoModelo] =
    useState("");

  const [equipoRecibidoImei, setEquipoRecibidoImei] =
    useState("");

  const [equipoRecibidoEstado, setEquipoRecibidoEstado] =
    useState("usado");

  const [equipoRecibidoBateria, setEquipoRecibidoBateria] =
    useState("");

  const [equipoRecibidoColor, setEquipoRecibidoColor] =
    useState("");

  const [valorToma, setValorToma] = useState("");

  // NUEVO:
  // Precio al que pensamos vender el equipo recibido
  const [precioVentaEquipoRecibido, setPrecioVentaEquipoRecibido] =
    useState("");

  // =========================
  // FORMA DE PAGO
  // =========================

  const [formaPago, setFormaPago] =
    useState<FormaPago | null>(null);

  const [cotizacionUsd, setCotizacionUsd] =
    useState("");

  const [cuotas, setCuotas] = useState("1");

  const [comisionPorcentaje, setComisionPorcentaje] =
    useState("");

  const [fechaAcreditacion, setFechaAcreditacion] =
    useState("");

  // =========================
  // MOVIMIENTOS MANUALES
  // =========================

  const [concepto, setConcepto] = useState("");
  const [montoMovimiento, setMontoMovimiento] =
    useState("");

  const [cuentaMovimiento, setCuentaMovimiento] =
    useState("");

  const [referencia, setReferencia] = useState("");

  // =========================
  // CARGAR DATOS
  // =========================

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setCargando(true);

    const [equiposResult, cuentasResult] =
      await Promise.all([
        supabase
          .from("equipos")
          .select("*")
          .eq("estado_stock", "disponible")
          .order("id", {
            ascending: false,
          }),

        supabase
          .from("cuentas_liquidez")
          .select("*")
          .eq("activa", true)
          .order("id"),
      ]);

    if (equiposResult.error) {
      console.error(
        "Error cargando equipos:",
        equiposResult.error
      );
    }

    if (cuentasResult.error) {
      console.error(
        "Error cargando cuentas:",
        cuentasResult.error
      );
    }

    setEquipos(
      (equiposResult.data || []) as Equipo[]
    );

    setCuentas(
      (cuentasResult.data || []) as Cuenta[]
    );

    setCargando(false);
  }

  // =========================
  // EQUIPO SELECCIONADO
  // =========================

  const equipoSeleccionado = useMemo(
    () =>
      equipos.find(
        (equipo) =>
          equipo.id === Number(equipoId)
      ),
    [equipos, equipoId]
  );

  // =========================
  // VALORES CALCULADOS
  // =========================

  const precioVentaNumero =
    Number(precioVenta) || 0;

  const valorTomaNumero =
    Number(valorToma) || 0;

  // NUEVO:
  const precioVentaEquipoRecibidoNumero =
    Number(precioVentaEquipoRecibido) || 0;

  const margenEsperadoEquipoRecibido =
    precioVentaEquipoRecibidoNumero -
    valorTomaNumero;

  const cotizacionNumero =
    Number(cotizacionUsd) || 0;

  const costoEquipo =
    Number(
      equipoSeleccionado?.costo_usd || 0
    );

  const comisionNumero =
    Number(comisionPorcentaje) || 0;

  const esPermuta =
    tienePermuta === true;

  const esArs =
    formaPago === "Efectivo ARS" ||
    formaPago === "Transferencia ARS";

  const esTarjetaCredito =
    formaPago === "Tarjeta crédito";

  const montoCobradoUsd =
    esPermuta
      ? Math.max(
          precioVentaNumero -
            valorTomaNumero,
          0
        )
      : precioVentaNumero;

  const montoOriginal =
    esArs
      ? montoCobradoUsd *
        cotizacionNumero
      : montoCobradoUsd;

  const comisionTarjeta =
    esTarjetaCredito
      ? (montoCobradoUsd *
          comisionNumero) /
        100
      : 0;

  const gananciaEstimada =
    precioVentaNumero -
    costoEquipo -
    comisionTarjeta;

  const diferencia =
    Math.max(
      precioVentaNumero -
        valorTomaNumero,
      0
    );

  // =========================
  // CUENTAS
  // =========================

  function buscarCuenta(
    nombre: string
  ) {
    return cuentas.find(
      (cuenta) =>
        cuenta.nombre === nombre
    );
  }

  function obtenerCuentaParaFormaPago(
    metodo: FormaPago
  ) {
    if (metodo === "USD billete") {
      return buscarCuenta(
        "Dólares billete"
      );
    }

    if (metodo === "Efectivo ARS") {
      return buscarCuenta(
        "Efectivo ARS"
      );
    }

    if (metodo === "USDT") {
      return buscarCuenta("USDT");
    }

    if (
      metodo === "Transferencia USD"
    ) {
      return buscarCuenta(
        "Transferencias USD"
      );
    }

    if (
      metodo === "Transferencia ARS"
    ) {
      return buscarCuenta(
        "Pesos argentinos"
      );
    }

    if (
      metodo === "Tarjeta crédito"
    ) {
      return cuentas.find(
        (cuenta) =>
          cuenta.tipo === "tarjeta"
      );
    }

    if (
      metodo === "Tarjeta débito"
    ) {
      return cuentas.find(
        (cuenta) =>
          cuenta.tipo === "banco" &&
          cuenta.moneda === "USD"
      );
    }

    return undefined;
  }

  function seleccionarFormaPago(
    metodo: FormaPago
  ) {
    setFormaPago(metodo);

    const cuenta =
      obtenerCuentaParaFormaPago(
        metodo
      );

    if (cuenta) {
      setCuentaMovimiento(
        String(cuenta.id)
      );
    }

    if (
      metodo !== "Tarjeta crédito"
    ) {
      setCuotas("1");
      setComisionPorcentaje("");
      setFechaAcreditacion("");
    }

    if (!(
      metodo === "Efectivo ARS" ||
      metodo === "Transferencia ARS"
    )) {
      setCotizacionUsd("");
    }
  }

  // =========================
  // CAMBIAR TIPO OPERACIÓN
  // =========================

  function cambiarTipoOperacion(
    tipo: TipoOperacion
  ) {
    setTipoOperacion(tipo);

    setCliente("");
    setEquipoId("");
    setPrecioVenta("");

    setEquipoRecibidoModelo("");
    setEquipoRecibidoImei("");
    setEquipoRecibidoEstado("usado");
    setEquipoRecibidoBateria("");
    setEquipoRecibidoColor("");
    setValorToma("");

    // NUEVO
    setPrecioVentaEquipoRecibido("");

    setFormaPago(null);
    setCotizacionUsd("");

    setCuotas("1");
    setComisionPorcentaje("");
    setFechaAcreditacion("");

    setConcepto("");
    setMontoMovimiento("");
    setCuentaMovimiento("");
    setReferencia("");

    if (tipo === "permuta") {
      setTienePermuta(true);
    } else {
      setTienePermuta(null);
    }
  }

  // =========================
  // GUARDAR VENTA
  // =========================

  async function guardarVenta() {
    if (!cliente.trim()) {
      alert(
        "Ingresá el nombre del cliente."
      );
      return;
    }

    if (!equipoSeleccionado) {
      alert(
        "Seleccioná un equipo."
      );
      return;
    }

    if (precioVentaNumero <= 0) {
      alert(
        "Ingresá un precio de venta válido."
      );
      return;
    }

    if (tienePermuta === null) {
      alert(
        "Indicá si el cliente entrega otro equipo."
      );
      return;
    }

    if (!formaPago) {
      alert(
        "Seleccioná una forma de pago."
      );
      return;
    }

    const cuenta =
      obtenerCuentaParaFormaPago(
        formaPago
      );

    if (!cuenta) {
      alert(
        "No se encontró la cuenta correspondiente a la forma de pago."
      );
      return;
    }

    if (
      esArs &&
      cotizacionNumero <= 0
    ) {
      alert(
        "Ingresá la cotización USD/ARS del momento."
      );
      return;
    }

    if (esPermuta) {
      if (
        !equipoRecibidoModelo.trim()
      ) {
        alert(
          "Ingresá el modelo del equipo recibido."
        );
        return;
      }

      if (valorTomaNumero <= 0) {
        alert(
          "Ingresá el valor de toma."
        );
        return;
      }

      // NUEVO:
      if (
        precioVentaEquipoRecibidoNumero <= 0
      ) {
        alert(
          "Ingresá el precio de venta del equipo recibido."
        );
        return;
      }

      if (
        precioVentaEquipoRecibidoNumero <=
        valorTomaNumero
      ) {
        alert(
          "El precio de venta del equipo recibido debe ser mayor al valor de toma."
        );
        return;
      }

      if (
        valorTomaNumero >=
        precioVentaNumero
      ) {
        alert(
          "El valor de toma debe ser menor al precio de venta."
        );
        return;
      }
    }

    if (
      esTarjetaCredito &&
      !fechaAcreditacion
    ) {
      alert(
        "Seleccioná la fecha estimada de acreditación."
      );
      return;
    }

    setGuardando(true);

    const monedaPago =
      esArs
        ? "ARS"
        : formaPago === "USDT"
        ? "USDT"
        : "USD";

    const { error } =
      await supabase.rpc(
        "registrar_venta",
        {
          p_cliente_nombre:
            cliente.trim(),

          p_equipo_id:
            equipoSeleccionado.id,

          p_precio_venta_usd:
            precioVentaNumero,

          p_forma_pago:
            formaPago,

          p_cuenta_liquidez_id:
            cuenta.id,

          p_moneda_pago:
            monedaPago,

          p_monto_original:
            montoOriginal,

          p_cotizacion_usd:
            esArs
              ? cotizacionNumero
              : null,

          p_tiene_permuta:
            esPermuta,

          p_equipo_recibido_modelo:
            esPermuta
              ? equipoRecibidoModelo.trim()
              : null,

          p_equipo_recibido_imei:
            esPermuta
              ? equipoRecibidoImei.trim()
              : null,

          p_equipo_recibido_estado:
            esPermuta
              ? equipoRecibidoEstado
              : null,

          p_equipo_recibido_bateria:
            esPermuta &&
            equipoRecibidoBateria
              ? Number(
                  equipoRecibidoBateria
                )
              : null,

          p_equipo_recibido_color:
            esPermuta
              ? equipoRecibidoColor.trim()
              : null,

          p_valor_toma_usd:
            esPermuta
              ? valorTomaNumero
              : null,

          // NUEVO:
          p_precio_venta_equipo_recibido_usd:
            esPermuta
              ? precioVentaEquipoRecibidoNumero
              : null,

          p_diferencia_pagada_usd:
            esPermuta
              ? diferencia
              : precioVentaNumero,

          p_cuotas:
            esTarjetaCredito
              ? Number(cuotas)
              : 1,

          p_comision_porcentaje:
            esTarjetaCredito
              ? comisionNumero
              : 0,

          p_fecha_acreditacion:
            esTarjetaCredito
              ? fechaAcreditacion
              : null,
        }
      );

    setGuardando(false);

    if (error) {
      console.error(error);

      alert(
        "Error al registrar la operación: " +
          error.message
      );

      return;
    }

    alert(
      esPermuta
        ? "Permuta registrada correctamente ✅"
        : "Venta registrada correctamente ✅"
    );

    limpiarFormularioVenta();

    await cargarDatos();
  }

  // =========================
  // LIMPIAR VENTA
  // =========================

  function limpiarFormularioVenta() {
    setCliente("");
    setEquipoId("");
    setPrecioVenta("");

    setTienePermuta(null);

    setEquipoRecibidoModelo("");
    setEquipoRecibidoImei("");
    setEquipoRecibidoEstado("usado");
    setEquipoRecibidoBateria("");
    setEquipoRecibidoColor("");
    setValorToma("");

    // NUEVO
    setPrecioVentaEquipoRecibido("");

    setFormaPago(null);
    setCotizacionUsd("");

    setCuotas("1");
    setComisionPorcentaje("");
    setFechaAcreditacion("");
  }

  // =========================
  // GUARDAR MOVIMIENTO
  // =========================

  async function guardarMovimiento(
    tipo: "ingreso" | "egreso"
  ) {
    if (!concepto.trim()) {
      alert(
        "Ingresá un concepto."
      );
      return;
    }

    const monto =
      Number(montoMovimiento);

    if (!monto || monto <= 0) {
      alert(
        "Ingresá un monto válido."
      );
      return;
    }

    if (!cuentaMovimiento) {
      alert(
        "Seleccioná una cuenta."
      );
      return;
    }

    const cuenta =
      cuentas.find(
        (item) =>
          item.id ===
          Number(cuentaMovimiento)
      );

    if (!cuenta) {
      alert(
        "La cuenta seleccionada no existe."
      );
      return;
    }

    if (
      cuenta.tipo === "tarjeta"
    ) {
      alert(
        "No podés registrar movimientos manuales en Tarjetas pendientes."
      );
      return;
    }

    setGuardando(true);

    const montoUsd =
      cuenta.moneda === "USD" ||
      cuenta.moneda === "USDT"
        ? monto
        : 0;

    const { error } =
      await supabase
        .from("movimientos")
        .insert({
          tipo,

          concepto:
            concepto.trim(),

          monto_usd:
            montoUsd,

          referencia:
            referencia.trim() ||
            null,

          cuenta_id:
            cuenta.id,

          moneda:
            cuenta.moneda,

          monto_original:
            monto,
        });

    setGuardando(false);

    if (error) {
      console.error(error);

      alert(
        "Error al registrar el movimiento: " +
          error.message
      );

      return;
    }

    alert(
      "Movimiento registrado correctamente ✅"
    );

    setConcepto("");
    setMontoMovimiento("");
    setCuentaMovimiento("");
    setReferencia("");
  }

  // =========================
  // RENDER
  // =========================

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-5xl">

        <div>
          <p className="text-sm font-medium text-gray-500">
            OPERACIONES
          </p>

          <h1 className="mt-1 text-3xl font-bold text-gray-900">
            Nueva operación
          </h1>

          <p className="mt-2 text-gray-500">
            Completá cada paso y el siguiente aparecerá automáticamente.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-5">

          {[
            ["venta", "Nueva venta"],
            ["permuta", "Permuta"],
            ["ingreso", "Ingresar equipo"],
            ["gasto", "Registrar gasto"],
            ["dinero", "Ingreso de dinero"],
          ].map(
            ([tipo, nombre]) => (
              <button
                key={tipo}
                type="button"
                onClick={() =>
                  cambiarTipoOperacion(
                    tipo as TipoOperacion
                  )
                }
                className={`rounded-xl border p-4 text-left transition ${
                  tipoOperacion === tipo
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <p className="font-medium">
                  {nombre}
                </p>
              </button>
            )
          )}

        </div>

        {(tipoOperacion === "venta" ||
          tipoOperacion === "permuta") && (
          <div className="mt-8 space-y-6">

            {/* PASO 1 */}

            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">

              <p className="text-sm font-medium text-gray-500">
                PASO 1
              </p>

              <h2 className="mt-1 text-xl font-semibold text-gray-900">
                Cliente
              </h2>

              <input
                value={cliente}
                onChange={(e) =>
                  setCliente(
                    e.target.value
                  )
                }
                placeholder="Nombre del cliente"
                className="mt-5 w-full rounded-xl border border-gray-300 px-4 py-3"
              />

              {!cliente.trim() && (
                <p className="mt-3 text-sm text-gray-500">
                  Ingresá el nombre para continuar.
                </p>
              )}

            </div>

            {/* PASO 2 */}

            {cliente.trim() && (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">

                <p className="text-sm font-medium text-gray-500">
                  PASO 2
                </p>

                <h2 className="mt-1 text-xl font-semibold text-gray-900">
                  Equipo que sale
                </h2>

                {cargando ? (
                  <p className="mt-5 text-gray-500">
                    Cargando stock...
                  </p>
                ) : (
                  <select
                    value={equipoId}
                    onChange={(e) =>
                      setEquipoId(
                        e.target.value
                      )
                    }
                    className="mt-5 w-full rounded-xl border border-gray-300 px-4 py-3"
                  >
                    <option value="">
                      Seleccionar equipo
                    </option>

                    {equipos.map(
                      (equipo) => (
                        <option
                          key={equipo.id}
                          value={equipo.id}
                        >
                          {equipo.modelo} — USD{" "}
                          {dinero(
                            equipo.precio_venta_usd ||
                              0
                          )}{" "}
                          {equipo.imei
                            ? `— ${equipo.imei}`
                            : ""}
                        </option>
                      )
                    )}
                  </select>
                )}

                {equipoSeleccionado && (
                  <div className="mt-5 rounded-xl bg-gray-50 p-5">

                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">

                      <div>
                        <p className="text-xs text-gray-500">
                          Modelo
                        </p>

                        <p className="mt-1 font-medium">
                          {equipoSeleccionado.modelo}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500">
                          Costo
                        </p>

                        <p className="mt-1 font-medium">
                          USD{" "}
                          {dinero(
                            costoEquipo
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500">
                          Precio sugerido
                        </p>

                        <p className="mt-1 font-medium">
                          USD{" "}
                          {dinero(
                            equipoSeleccionado.precio_venta_usd ||
                              0
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500">
                          IMEI
                        </p>

                        <p className="mt-1 font-medium">
                          {equipoSeleccionado.imei ||
                            "Sin IMEI"}
                        </p>
                      </div>

                    </div>

                  </div>
                )}

              </div>
            )}

            {/* PASO 3 */}

            {equipoSeleccionado && (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">

                <p className="text-sm font-medium text-gray-500">
                  PASO 3
                </p>

                <h2 className="mt-1 text-xl font-semibold text-gray-900">
                  Precio de venta
                </h2>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">

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

                  <div className="rounded-xl bg-gray-50 px-5 py-4">

                    <p className="text-xs text-gray-500">
                      Ganancia estimada
                    </p>

                    <p className="mt-1 text-xl font-bold text-green-600">
                      USD{" "}
                      {dinero(
                        gananciaEstimada
                      )}
                    </p>

                  </div>

                </div>

              </div>
            )}

            {/* PASO 4 - PERMUTA */}

            {equipoSeleccionado &&
              precioVentaNumero > 0 && (
                <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">

                  <p className="text-sm font-medium text-gray-500">
                    PASO 4
                  </p>

                  <h2 className="mt-1 text-xl font-semibold text-gray-900">
                    {tipoOperacion ===
                    "permuta"
                      ? "Equipo que entrega el cliente"
                      : "¿El cliente entrega otro equipo?"}
                  </h2>

                  {tipoOperacion ===
                  "venta" ? (
                    <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">

                      <button
                        type="button"
                        onClick={() =>
                          setTienePermuta(
                            false
                          )
                        }
                        className={`rounded-xl border p-5 text-left transition ${
                          tienePermuta ===
                          false
                            ? "border-gray-900 bg-gray-900 text-white"
                            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <p className="font-semibold">
                          No
                        </p>

                        <p
                          className={`mt-1 text-sm ${
                            tienePermuta ===
                            false
                              ? "text-gray-300"
                              : "text-gray-500"
                          }`}
                        >
                          Venta normal
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setTienePermuta(
                            true
                          )
                        }
                        className={`rounded-xl border p-5 text-left transition ${
                          tienePermuta ===
                          true
                            ? "border-gray-900 bg-gray-900 text-white"
                            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <p className="font-semibold">
                          Sí
                        </p>

                        <p
                          className={`mt-1 text-sm ${
                            tienePermuta ===
                            true
                              ? "text-gray-300"
                              : "text-gray-500"
                          }`}
                        >
                          Recibe otro equipo
                        </p>
                      </button>

                    </div>
                  ) : (
                    <div className="mt-5 rounded-xl bg-gray-900 p-5 text-white">

                      <p className="font-semibold">
                        Permuta seleccionada
                      </p>

                      <p className="mt-1 text-sm text-gray-300">
                        El cliente entrega un equipo como parte de pago.
                      </p>

                    </div>
                  )}

                </div>
              )}

            {/* EQUIPO RECIBIDO */}

            {tienePermuta === true && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-8">

                <p className="text-sm font-medium text-blue-600">
                  PASO 5
                </p>

                <h2 className="mt-1 text-xl font-semibold text-blue-950">
                  Datos del equipo recibido
                </h2>

                <p className="mt-2 text-sm text-blue-700">
                  Este equipo ingresará automáticamente al stock.
                </p>

                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">

                  <input
                    value={
                      equipoRecibidoModelo
                    }
                    onChange={(e) =>
                      setEquipoRecibidoModelo(
                        e.target.value
                      )
                    }
                    placeholder="Modelo"
                    className="rounded-xl border border-blue-200 bg-white px-4 py-3"
                  />

                  <input
                    value={
                      equipoRecibidoImei
                    }
                    onChange={(e) =>
                      setEquipoRecibidoImei(
                        e.target.value
                      )
                    }
                    placeholder="IMEI"
                    className="rounded-xl border border-blue-200 bg-white px-4 py-3"
                  />

                  <select
                    value={
                      equipoRecibidoEstado
                    }
                    onChange={(e) =>
                      setEquipoRecibidoEstado(
                        e.target.value
                      )
                    }
                    className="rounded-xl border border-blue-200 bg-white px-4 py-3"
                  >
                    <option value="usado">
                      Usado
                    </option>

                    <option value="nuevo">
                      Nuevo
                    </option>
                  </select>

                  <input
                    value={
                      equipoRecibidoBateria
                    }
                    onChange={(e) =>
                      setEquipoRecibidoBateria(
                        e.target.value
                      )
                    }
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Batería %"
                    className="rounded-xl border border-blue-200 bg-white px-4 py-3"
                  />

                  <input
                    value={
                      equipoRecibidoColor
                    }
                    onChange={(e) =>
                      setEquipoRecibidoColor(
                        e.target.value
                      )
                    }
                    placeholder="Color"
                    className="rounded-xl border border-blue-200 bg-white px-4 py-3"
                  />

                  {/* VALOR DE TOMA */}

                  <input
                    value={valorToma}
                    onChange={(e) =>
                      setValorToma(
                        e.target.value
                      )
                    }
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Valor de toma USD"
                    className="rounded-xl border border-blue-200 bg-white px-4 py-3"
                  />

                  {/* NUEVO: PRECIO DE VENTA */}

                  <div>
                    <input
                      value={
                        precioVentaEquipoRecibido
                      }
                      onChange={(e) =>
                        setPrecioVentaEquipoRecibido(
                          e.target.value
                        )
                      }
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Precio de venta USD"
                      className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3"
                    />

                    <p className="mt-2 text-xs text-blue-700">
                      Precio al que pensás vender este equipo.
                    </p>
                  </div>

                </div>

                {/* NUEVO: MARGEN ESPERADO */}

                {valorTomaNumero > 0 &&
                  precioVentaEquipoRecibidoNumero > 0 && (
                    <div className="mt-5 rounded-xl bg-white p-5">

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

                        <div>
                          <p className="text-xs text-gray-500">
                            Valor de toma
                          </p>

                          <p className="mt-1 font-semibold text-gray-900">
                            USD{" "}
                            {dinero(
                              valorTomaNumero
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500">
                            Precio de venta
                          </p>

                          <p className="mt-1 font-semibold text-gray-900">
                            USD{" "}
                            {dinero(
                              precioVentaEquipoRecibidoNumero
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500">
                            Margen esperado
                          </p>

                          <p className="mt-1 text-xl font-bold text-green-600">
                            USD{" "}
                            {dinero(
                              margenEsperadoEquipoRecibido
                            )}
                          </p>
                        </div>

                      </div>

                    </div>
                  )}

                <div className="mt-6 rounded-xl bg-white p-5">

                  <div className="flex items-center justify-between">

                    <div>
                      <p className="text-sm text-gray-500">
                        Diferencia que paga el cliente
                      </p>

                      <p className="mt-1 text-2xl font-bold text-gray-900">
                        USD{" "}
                        {dinero(
                          diferencia
                        )}
                      </p>
                    </div>

                    <div className="text-right text-sm">

                      <p className="text-gray-500">
                        Venta: USD{" "}
                        {dinero(
                          precioVentaNumero
                        )}
                      </p>

                      <p className="text-gray-500">
                        Toma: USD{" "}
                        {dinero(
                          valorTomaNumero
                        )}
                      </p>

                    </div>

                  </div>

                </div>

              </div>
            )}

            {/* PASO FORMA DE PAGO */}

            {tienePermuta !== null &&
              (tienePermuta === false ||
                equipoRecibidoModelo.trim()) &&
              (!tienePermuta ||
                valorTomaNumero > 0) &&
              (!tienePermuta ||
                precioVentaEquipoRecibidoNumero > 0) && (
                <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">

                  <p className="text-sm font-medium text-gray-500">
                    PASO {tienePermuta ? "6" : "5"}
                  </p>

                  <h2 className="mt-1 text-xl font-semibold text-gray-900">
                    Forma de pago
                  </h2>

                  <p className="mt-2 text-sm text-gray-500">
                    Seleccioná cómo ingresa el dinero.
                  </p>

                  <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">

                    {[
                      {
                        nombre:
                          "USD billete",
                        descripcion:
                          "Dólares en efectivo",
                      },
                      {
                        nombre:
                          "Efectivo ARS",
                        descripcion:
                          "Pesos en efectivo",
                      },
                      {
                        nombre:
                          "USDT",
                        descripcion:
                          "Criptomoneda",
                      },
                      {
                        nombre:
                          "Transferencia USD",
                        descripcion:
                          "Transferencia en dólares",
                      },
                      {
                        nombre:
                          "Transferencia ARS",
                        descripcion:
                          "Transferencia en pesos",
                      },
                      {
                        nombre:
                          "Tarjeta débito",
                        descripcion:
                          "Acreditación inmediata",
                      },
                      {
                        nombre:
                          "Tarjeta crédito",
                        descripcion:
                          "Pendiente de acreditación",
                      },
                    ].map(
                      (metodo) => (
                        <button
                          key={
                            metodo.nombre
                          }
                          type="button"
                          onClick={() =>
                            seleccionarFormaPago(
                              metodo.nombre as FormaPago
                            )
                          }
                          className={`rounded-xl border p-5 text-left transition ${
                            formaPago ===
                            metodo.nombre
                              ? "border-gray-900 bg-gray-900 text-white"
                              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                          }`}
                        >

                          <p className="font-semibold">
                            {
                              metodo.nombre
                            }
                          </p>

                          <p
                            className={`mt-1 text-xs ${
                              formaPago ===
                              metodo.nombre
                                ? "text-gray-300"
                                : "text-gray-500"
                            }`}
                          >
                            {
                              metodo.descripcion
                            }
                          </p>

                        </button>
                      )
                    )}

                  </div>

                </div>
              )}

            {/* PAGO ARS */}

            {formaPago &&
              esArs && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-8">

                  <p className="text-sm font-medium text-blue-600">
                    PAGO EN PESOS
                  </p>

                  <h2 className="mt-1 text-xl font-semibold text-blue-950">
                    Cotización USD/ARS
                  </h2>

                  <p className="mt-2 text-sm text-blue-700">
                    Esta cotización se guarda con la operación y queda congelada para siempre.
                  </p>

                  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">

                    <div>

                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Cotización del momento
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

                    <div className="rounded-xl bg-white p-5">

                      <p className="text-xs text-gray-500">
                        Total real a cobrar
                      </p>

                      <p className="mt-1 text-2xl font-bold text-gray-900">
                        ARS $
                        {dinero(
                          montoOriginal
                        )}
                      </p>

                      <p className="mt-2 text-xs text-gray-500">
                        USD{" "}
                        {dinero(
                          montoCobradoUsd
                        )}{" "}
                        ×{" "}
                        {dinero(
                          cotizacionNumero
                        )}
                      </p>

                    </div>

                  </div>

                  <div className="mt-5 rounded-xl bg-white p-4">

                    <p className="text-xs text-gray-500">
                      Cuenta
                    </p>

                    <p className="mt-1 font-semibold text-gray-900">
                      {formaPago ===
                      "Efectivo ARS"
                        ? "Efectivo ARS"
                        : "Pesos argentinos"}
                    </p>

                  </div>

                </div>
              )}

            {/* TARJETA */}

            {formaPago ===
              "Tarjeta crédito" && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8">

                <p className="text-sm font-medium text-amber-700">
                  TARJETA DE CRÉDITO
                </p>

                <h2 className="mt-1 text-xl font-semibold text-amber-950">
                  Datos de acreditación
                </h2>

                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Cuotas
                    </label>

                    <input
                      value={cuotas}
                      onChange={(e) =>
                        setCuotas(
                          e.target.value
                        )
                      }
                      type="number"
                      min="1"
                      className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Comisión %
                    </label>

                    <input
                      value={
                        comisionPorcentaje
                      }
                      onChange={(e) =>
                        setComisionPorcentaje(
                          e.target.value
                        )
                      }
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Ej: 5"
                      className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Fecha de acreditación
                    </label>

                    <input
                      value={
                        fechaAcreditacion
                      }
                      onChange={(e) =>
                        setFechaAcreditacion(
                          e.target.value
                        )
                      }
                      type="date"
                      className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3"
                    />
                  </div>

                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">

                  <div className="rounded-xl bg-white p-4">

                    <p className="text-xs text-gray-500">
                      Cobro
                    </p>

                    <p className="mt-1 font-bold">
                      USD{" "}
                      {dinero(
                        montoCobradoUsd
                      )}
                    </p>

                  </div>

                  <div className="rounded-xl bg-white p-4">

                    <p className="text-xs text-gray-500">
                      Comisión
                    </p>

                    <p className="mt-1 font-bold">
                      USD{" "}
                      {dinero(
                        comisionTarjeta
                      )}
                    </p>

                  </div>

                  <div className="rounded-xl bg-white p-4">

                    <p className="text-xs text-gray-500">
                      Neto
                    </p>

                    <p className="mt-1 font-bold">
                      USD{" "}
                      {dinero(
                        montoCobradoUsd -
                          comisionTarjeta
                      )}
                    </p>

                  </div>

                </div>

              </div>
            )}

            {/* RESUMEN */}

            {formaPago &&
              (!esArs ||
                cotizacionNumero > 0) &&
              (!esTarjetaCredito ||
                fechaAcreditacion) && (
                <div className="rounded-2xl bg-gray-900 p-8 text-white">

                  <p className="text-sm text-gray-400">
                    ÚLTIMO PASO
                  </p>

                  <h2 className="mt-1 text-xl font-semibold">
                    Resumen de la operación
                  </h2>

                  <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">

                    <div>
                      <p className="text-xs text-gray-400">
                        Cliente
                      </p>

                      <p className="mt-1 font-medium">
                        {cliente}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400">
                        Equipo
                      </p>

                      <p className="mt-1 font-medium">
                        {
                          equipoSeleccionado?.modelo
                        }
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400">
                        Precio de venta
                      </p>

                      <p className="mt-1 font-medium">
                        USD{" "}
                        {dinero(
                          precioVentaNumero
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400">
                        Forma de pago
                      </p>

                      <p className="mt-1 font-medium">
                        {formaPago}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400">
                        Cobro
                      </p>

                      <p className="mt-1 text-xl font-bold">

                        {esArs
                          ? `ARS $${dinero(
                              montoOriginal
                            )}`
                          : `USD ${dinero(
                              montoCobradoUsd
                            )}`}

                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400">
                        Cuenta
                      </p>

                      <p className="mt-1 font-medium">
                        {formaPago ===
                        "USD billete"
                          ? "Dólares billete"
                          : formaPago ===
                            "Efectivo ARS"
                          ? "Efectivo ARS"
                          : formaPago ===
                            "USDT"
                          ? "USDT"
                          : formaPago ===
                            "Transferencia USD"
                          ? "Transferencias USD"
                          : formaPago ===
                            "Transferencia ARS"
                          ? "Pesos argentinos"
                          : formaPago ===
                            "Tarjeta crédito"
                          ? "Tarjetas pendientes"
                          : "Transferencias USD"}
                      </p>
                    </div>

                    {esArs && (
                      <div>
                        <p className="text-xs text-gray-400">
                          Cotización congelada
                        </p>

                        <p className="mt-1 font-medium">
                          $
                          {dinero(
                            cotizacionNumero
                          )}
                        </p>
                      </div>
                    )}

                    {esPermuta && (
                      <>
                        <div>
                          <p className="text-xs text-gray-400">
                            Equipo recibido
                          </p>

                          <p className="mt-1 font-medium">
                            {
                              equipoRecibidoModelo
                            }
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-400">
                            Valor de toma
                          </p>

                          <p className="mt-1 font-medium">
                            USD{" "}
                            {dinero(
                              valorTomaNumero
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-400">
                            Precio de venta equipo recibido
                          </p>

                          <p className="mt-1 font-medium">
                            USD{" "}
                            {dinero(
                              precioVentaEquipoRecibidoNumero
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-400">
                            Margen esperado equipo recibido
                          </p>

                          <p className="mt-1 text-xl font-bold text-green-400">
                            USD{" "}
                            {dinero(
                              margenEsperadoEquipoRecibido
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-400">
                            Diferencia
                          </p>

                          <p className="mt-1 text-xl font-bold">
                            USD{" "}
                            {dinero(
                              diferencia
                            )}
                          </p>
                        </div>
                      </>
                    )}

                  </div>

                  <div className="mt-6 rounded-xl bg-white/10 p-4">

                    <div className="flex items-center justify-between">

                      <span className="text-gray-300">
                        Ganancia estimada
                      </span>

                      <span className="text-xl font-bold">
                        USD{" "}
                        {dinero(
                          gananciaEstimada
                        )}
                      </span>

                    </div>

                  </div>

                  <button
                    type="button"
                    onClick={
                      guardarVenta
                    }
                    disabled={
                      guardando
                    }
                    className="mt-8 w-full rounded-xl bg-white px-5 py-4 font-semibold text-gray-900 hover:bg-gray-100 disabled:opacity-50"
                  >
                    {guardando
                      ? "Registrando..."
                      : esPermuta
                      ? "Confirmar permuta"
                      : "Confirmar venta"}
                  </button>

                </div>
              )}

          </div>
        )}

        {/* ================================================= */}
        {/* INGRESAR EQUIPO */}
        {/* ================================================= */}

        {tipoOperacion ===
          "ingreso" && (
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">

            <p className="text-sm font-medium text-gray-500">
              INGRESO DE EQUIPO
            </p>

            <h2 className="mt-1 text-xl font-semibold text-gray-900">
              Ingresar equipo
            </h2>

            <p className="mt-3 text-gray-500">
              Para que el ingreso del equipo afecte correctamente stock, liquidez y costo, utilizá la sección Compras.
            </p>

            <div className="mt-6 rounded-xl bg-gray-50 p-5 text-sm text-gray-600">

              <strong>
                Compras
              </strong>{" "}
              se encarga de registrar el equipo y su impacto financiero automáticamente.

            </div>

          </div>
        )}

        {/* ================================================= */}
        {/* GASTO / INGRESO DE DINERO */}
        {/* ================================================= */}

        {(tipoOperacion === "gasto" ||
          tipoOperacion === "dinero") && (
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">

            <p className="text-sm font-medium text-gray-500">
              MOVIMIENTO
            </p>

            <h2 className="mt-1 text-xl font-semibold text-gray-900">
              {tipoOperacion === "gasto"
                ? "Registrar gasto"
                : "Ingreso de dinero"}
            </h2>

            <div className="mt-6 space-y-5">

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Concepto
                </label>

                <input
                  value={concepto}
                  onChange={(e) =>
                    setConcepto(
                      e.target.value
                    )
                  }
                  placeholder={
                    tipoOperacion ===
                    "gasto"
                      ? "Ej: Combustible"
                      : "Ej: Dinero aportado"
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Monto
                </label>

                <input
                  value={
                    montoMovimiento
                  }
                  onChange={(e) =>
                    setMontoMovimiento(
                      e.target.value
                    )
                  }
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Monto"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Cuenta
                </label>

                <select
                  value={
                    cuentaMovimiento
                  }
                  onChange={(e) =>
                    setCuentaMovimiento(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3"
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
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Referencia / observación
                </label>

                <input
                  value={
                    referencia
                  }
                  onChange={(e) =>
                    setReferencia(
                      e.target.value
                    )
                  }
                  placeholder="Opcional"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3"
                />
              </div>

            </div>

            <button
              type="button"
              onClick={() =>
                guardarMovimiento(
                  tipoOperacion ===
                    "gasto"
                    ? "egreso"
                    : "ingreso"
                )
              }
              disabled={
                guardando
              }
              className="mt-6 w-full rounded-xl bg-gray-900 px-6 py-4 font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {guardando
                ? "Guardando..."
                : tipoOperacion ===
                  "gasto"
                ? "Registrar gasto"
                : "Registrar ingreso"}
            </button>

          </div>
        )}

      </div>
    </div>
  );
}