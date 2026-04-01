# GUÍA DEL DUEÑO — Cómo Ganar Dinero y Monitorear

## Tu Sistema de Ganancias

### 1. Margen en Cuotas (Principal)

```
Cuota Real: 2.00 (50% probabilidad)
Cuota Mostrada: 1.82 (con 10% margen)

Usuario apuesta 100 USDT:
- Si gana: Recibe 182 USDT (no 200)
- Si pierde: Recupera 100 USDT (money back)

TU GANANCIA: 18 USDT en la apuesta ganadora
```

### 2. Comisión por Retiro (1 USDT)

```typescript
// En app/api/withdraw/request/route.ts
const FEE = 1; // USDT por retiro

Usuario retira 100 USDT:
- Se descuentan 100 de su saldo
- Se envían 99 USDT a su wallet
- TU GANANCIA: 1 USDT
```

⚠️ **PROBLEMA: El fee NO se está registrando como ingreso de la casa**

### 3. Depósitos RUB (Opcional)

```
Usuario deposita en RUB → Tú cambias a USDT con tu tasa
Ejemplo: 
- Tasa: 95 RUB = 1 USDT
- Usuario deposita 950 RUB
- Le acreditas 10 USDT
- Tu ganancia: spread del cambio
```

---

## ¿Qué Falta en el Código?

### ⚠️ CRÍTICO: Tracking de Ganancias

Actualmente NO existe manera de ver:

| Métrica | Estado | Necesario |
|---------|--------|-----------|
| Total depositado | ❌ No | ✅ Sí |
| Total retirado | ❌ No | ✅ Sí |
| Fee de retiros acumulado | ❌ No | ✅ Sí |
| Ganancias por apuestas | ❌ No | ✅ Sí |
| Balance de la casa | ❌ No | ✅ Sí |
| Usuarios activos | ❌ No | ✅ Sí |
| Partidos ganados/perdidos | ❌ No | ✅ Sí |

### ⚠️ Problema del Fee de Retiro

```typescript
// CÓMO ESTÁ AHORA:
const netAmount = parseFloat((amount - FEE).toFixed(6));
// Se resta del usuario: -100 USDT
// Se crea transacción: amount: 99 USDT, fee: 1 USDT
// ❌ Los 1 USDT se pierden, no van a ningún lado

// CÓMO DEBERÍA SER:
// 1. Crear transacción de retiro: 99 USDT al usuario
// 2. Crear transacción de FEE: 1 USDT a la casa
// 3. El dueño ve: "Ganaste $50 en fees este mes"
```

---

## Cómo Monitorear SIN VOLVERTE LOCO

### Dashboard Propuesto

```
┌─────────────────────────────────────────────────────────┐
│                    RESUMEN DEL DÍA                       │
├─────────────────────────────────────────────────────────┤
│ 💰 Depósitos Hoy:        +125.00 USDT                   │
│ 💸 Retiros Hoy:          -45.00 USDT                    │
│ 📊 Fees Acumulados:        +5.00 USDT (5 retiros)         │
│ 🎰 Apuestas Activas:      350.00 USDT                    │
│ ⚠️ Exposición Total:      -50.00 USDT                    │
│ ✅ Balance Casa:         1,000.00 USDT                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  GANANCIAS ESTE MES                      │
├─────────────────────────────────────────────────────────┤
│ Margen en cuotas:        +180.50 USDT                    │
│ Fees de retiro:           +12.00 USDT                    │
│ Total:                    +192.50 USDT                   │
└─────────────────────────────────────────────────────────┘
```

### Acciones Diarias (5 minutos)

1. **Revisar Exposure Tab**
   - Si exposición total > reserva → preocuparse
   - Cerrar partidos con mucha exposición

2. **Aprobar Retiros**
   - Tab "Withdrawals" → Aprobar/Rechazar
   - Ganar $1 USD por aprobación

3. **Settle Partidos**
   - Tab "Matches" → Partidos con status "closed"
   - Ingresar resultado y scores

4. **Revisar Depósitos RUB** (si usas)
   - Tab "RUB ₽" → Aprobar depósitos manuales

### Acciones Semanales

1. **Ver estadísticas**
   - Total usuarios nuevos
   - Total depositado vs retirado
   - Ganancias del mes

2. **Ajustar cuotas**
   - Si exposición crece → bajar cuotas altas
   - Si pocos jugadores → subir cuotas un poco

---

## Flujo de Dinero Completo

```
┌─────────────┐
│  USUARIO A  │
└──────┬──────┘
       │ 1. Deposita 100 USDT (OxaPay)
       ↓
┌─────────────┐     ┌─────────────┐
│  BALANCE    │←────│  WEBHOOK    │
│  USUARIO    │     │  OxaPay     │
│  A: 100     │     │  confirma   │
└──────┬──────┘     └─────────────┘
       │
       │ 2. Apuesta 50 USDT en Home Win @ 1.85
       ↓
┌─────────────┐
│  BALANCE    │
│  USUARIO    │
│  A: 50      │
└─────────────┘
       │
       │ 3. Partido termina: Home Win
       │
       │ 4a. Si GANA:
       │     → Usuario recibe: 50 × 1.85 = 92.50 USDT
       │     → Balance: 50 + 92.50 = 142.50 USDT
       │     → CASA pierde: 42.50 USDT (de la reserva)
       │     → PERO: margen ya estaba en cuota
       │
       │ 4b. Si PIERDE (Money Back):
       │     → Usuario recibe: 50 USDT devueltos
       │     → Balance: 50 + 50 = 100 USDT
       │     → CASA gana: 0 USDT (ni gana ni pierde)
       │
       │ 4c. Si PIERDE (SIN Money Back):
       │     → Usuario recibe: 0 USDT
       │     → CASA gana: 50 USDT
       │
       ↓
┌─────────────┐
│  USUARIO    │
│  QUIERE     │
│  RETIRAR    │
│  100 USDT   │
└──────┬──────┘
       │
       │ 5. Solicita retiro: 100 USDT
       │    - Fee: 1 USDT
       │    - Neto enviado: 99 USDT
       │    - Admin aprueba
       │
       ↓
┌─────────────┐     ┌─────────────┐
│  BALANCE    │     │  BEP20      │
│  USUARIO    │     │  ENVÍA      │
│  A: 0       │     │  99 USDT    │
└─────────────┘     │  +1 USDT    │← CASA GANA
                    │  (fee)      │
                    └─────────────┘
```

---

## Configuración Óptima para Ganar

### Settings Recomendados

```typescript
{
  minDepositAmount: 10,      // Mínimo para entrar
  minBetAmount: 1,           // Accesible para todos
  maxBetAmount: 50,          // Limita riesgo
  maxPotentialPayout: 200,   // Máximo que puede ganar
  autoCloseMinutes: 30,      // Cierra 30 min antes
  houseReserve: 1000,        // Tu dinero real disponible
  liveScoreRefreshSecs: 30   // Actualiza cada 30s
}
```

### Money Back: ¿Activo o No?

| Opción | Ventajas | Desventajas |
|--------|----------|-------------|
| **Activo** | Usuarios confían, vuelven a apostar | Menor ganancia inmediata |
| **Inactivo** | Mayor ganancia inmediata | Usuarios pueden irse, menos retención |

**Recomendación:** Mantener activo (estilo u91)

---

## Qué Falta Implementar

### 1. Dashboard de Estadísticas

```typescript
// Nuevo tab en Admin: "Dashboard"
interface DashboardStats {
  totalUsers: number;
  activeUsersToday: number;
  totalDeposited: number;      // suma de todos los depósitos
  totalWithdrawn: number;      // suma de todos los retiros
  totalFees: number;           // fees de retiro acumulados
  totalBets: number;           // cantidad de apuestas
  totalBetsAmount: number;     // monto total apostado
  totalPayouts: number;        // monto total pagado a ganadores
  houseProfit: number;         // deposits - withdrawals - payouts
  openBets: number;            // apuestas activas
  exposure: number;            // exposición actual
}
```

### 2. Tracking de Fees

```typescript
// Crear transacción de fee en withdraw
await Transaction.create({
  userId: null, // null = casa
  type: 'fee',
  amount: FEE,
  currency: 'USDT',
  status: 'completed',
  relatedTx: transaction._id,
});
```

### 3. Nueva Tabla de Fees

```typescript
// En models/Transaction.ts, agregar tipo:
type: { type: String, enum: ['deposit', 'withdraw', 'bet', 'win', 'referral', 'fee'] }
```

### 4. API de Estadísticas

```typescript
// GET /api/admin/stats
export async function GET() {
  const stats = {
    balances: await User.aggregate([
      { $group: { _id: null, total: { $sum: '$balance' } } }
    ]),
    deposits: await Transaction.aggregate([
      { $match: { type: 'deposit', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    withdrawals: await Transaction.aggregate([
      { $match: { type: 'withdraw', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    pendingBets: await Bet.countDocuments({ status: 'pending' }),
    // ... más métricas
  };
  return NextResponse.json({ stats });
}
```

### 5. Alertas Automáticas

```typescript
// En Settings, agregar:
{
  alertExposurePercent: 80,   // Alerta si exposición > 80% de reserva
  alertBigBet: 30,            // Alerta si apuesta > 30 USDT
  alertManyWithdrawals: 5,    // Alerta si >5 retiros pendientes
}
```

---

## Resumen: Tu Plan de Acción

### Diario (5 min)
1. ✅ Revisar Exposure tab
2. ✅ Aprobar retiros pendientes
3. ✅ Settle partidos cerrados

### Semanal (30 min)
1. ✅ Ver estadísticas
2. ✅ Ajustar cuotas si es necesario
3. ✅ Verificar reserva vs exposición

### Mensual
1. ✅ Calcular ganancias totales
2. ✅ Ver tendencias de usuarios
3. ✅ Decidir si necesitas más reserva

---

## Fórmula de Ganancia Final

```
GANANCIA CASA = 
  (Suma de márgenes en apuestas ganadoras)
  + (Fees de retiro)
  + (Apuestas perdidas SIN money back)
  - (Pagos a ganadores)
  - (Money back a perdedores)

Ejemplo mensual:
- 1000 apuestas × 50 USDT promedio = 50,000 USDT apostados
- 40% ganan con cuota 1.85 → 20,000 × 1.85 = 37,000 USDT pagados
- Margen implícito: 50,000 - (50,000 × 0.888) = 5,600 USDT
- Fees: 100 retiros × 1 USDT = 100 USDT
- GANANCIA: ~5,700 USDT/mes (teórico)
```

---

## Contacto y Soporte

Si necesitas agregar funcionalidades:
1. Dashboard de estadísticas
2. Tracking de fees
3. Alertas automáticas
4. Logs de actividades

Dime y lo implementamos.