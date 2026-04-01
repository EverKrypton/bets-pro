# GANANCIAS — Cómo Genera Dinero la Casa

## Resumen del Sistema

Bets Pro utiliza un **sistema de apuestas inverso** (similar a u91) donde los usuarios tienen ventaja pero la casa siempre gana a largo plazo gracias al margen en las cuotas.

---

## Flujo Completo del Usuario

### 1. Depósito Mínimo:10 USDT

```
Usuario deposita10 USDT
     ↓
OxaPay genera dirección BEP20 estática
     ↓
Usuario envía USDT a la dirección
     ↓
Webhook confirma → Saldo actualizado: 10 USDT
```

### 2. Apuesta Máxima: 500 USDT (configurable)

```
Usuario apuesta 500 USDT en "Home Win" cuota 1.85
     ↓
Saldo: 500 - 500 = 0 USDT (o 10 - 500 ERROR: excede saldo)
     ↓
Si el usuario tiene saldo suficiente:
     - Se descuenta la apuesta
     - Ganancia potencial: 500 × 1.85 = 925 USDT
```

### 3. Escenario: Usuario Pierde (Sistema Money Back Activado)

```
Apuesta: 100 USDT en "Home Win" cuota 2.00
Resultado: Away Win (perdió)

SIN Money Back:
- Usuario pierde 100 USDT
- Casa gana 100 USDT

CON Money Back (este sistema):
- Usuario RECUPERA los 100 USDT
- Casa gana 0 USDT en esta apuesta
- Usuario no perdió nada
```

### 4. Escenario: Usuario Gana

```
Apuesta: 100 USDT en "Home Win" cuota 2.00
Resultado: Home Win (ganó)

Pago al usuario: 100 × 2.00 = 200 USDT
Ganancia neta del usuario: 200 - 100 = 100 USDT
Casa paga: 200 USDT
```

---

## Cómo Gana la Casa

### El Secreto: Margen en las Cuotas

La casa **nunca muestra cuotas reales**. Siempre muestra cuotas con margen incorporado.

#### Fórmula:

```
Cuota Mostrada = 1 / ((1 / CuotaReal) × (1 + Margen))

Ejemplo con 10% de margen:
- Cuota real: 2.00
- Margen: 10%
- Probabilidad real: 50% (1/2.00)
- Probabilidad ajustada: 55% (50% × 1.10)
- Cuota mostrada: 1.82 (1/0.55)
```

#### Ejemplo Práctico:

| Evento | Probabilidad Real | Cuota Real | Cuota Mostrada (10% margen) |
|--------|-------------------|------------|----------------------------|
| Home Win | 50% | 2.00 | 1.82 |
| Draw | 25% | 4.00 | 3.64 |
| Away Win | 25% | 4.00 | 3.64 |

**Suma de probabilidades mostradas:** 55% + 27.5% + 27.5% = **110%**

Ese 10% extra es el **vigorish (vig)** o ventaja de la casa.

---

## Escenarios de Ganancia/Pérdida

### Escenario A: Apuesta Balanceada

```
Total apostado: 1000 USDT
- Home: 400 USDT (40%)
- Draw: 200 USDT (20%)
- Away: 400 USDT (40%)

Siempre se paga igual sin importar resultado:
- Home gana: 400 × 1.82 = 728 USDT
- Draw gana: 200 × 3.64 = 728 USDT
- Away gana: 400 × 1.82 = 728 USDT

Ganancia de la casa:
- 1000 apostados - 728 pagados = 272 USDT ganancia
```

### Escenario B: Apuesta Desbalanceada (Riesgo)

```
Total apostado: 1000 USDT
- Home: 800 USDT (80%)
- Draw: 100 USDT (10%)
- Away: 100 USDT (10%)

Resultados posibles:
- Home gana: Casa paga 800 × 1.82 = 1456 USDT → PIERDE 456 USDT
- Draw gana: Casa paga 100 × 3.64 = 364 USDT → GANA 636 USDT
- Away gana: Casa paga 100 × 1.82 = 182 USDT → GANA 818 USDT

Con Money Back activado:
- Home pierde: 800 USDT devueltos → Casa pierde solo 182 USDT (de draw/away)
- Casa gana cuando NO gana Home
```

### Escenario C: Money Back Activo (Este Sistema)

```
Usuario apuesta 100 USDT en Home Win @ 2.00
- Cuota real: 2.00
- Cuota mostrada: 1.82 (con10% margen)

Si Home gana:
- Usuario recibe: 100 × 1.82 = 182 USDT
- Ganancia usuario: 82 USDT (no 100 USDT que sería con cuota real)
- Casa paga 182 en lugar de 200

Si Home pierde (Money Back):
- Usuario recupera 100 USDT
- Casa gana 0 en esta apuesta
- PERO: el margen ya se aplicó cuando el usuario ganó

A largo plazo:
- Jugadores ganan: reciben cuotas bajas
- Jugadores pierden: recuperan apuesta (no pueden perder todo)
- Casa gana: la diferencia entre cuota real y mostrada
```

---

## Cómo Gana u91 y 1Win

### u91 (Sistema Inverso)

u91 utiliza exactamente este modelo:

1. **Cuotas con margen:** Siempre muestran cuotas más bajas que las reales
2. **Money Back:** Los perdedores recuperan su apuesta
3. **Ganancia:** Viene del margen en las cuotas de los ganadores

```
Ejemplo u91:
- 1000 usuarios apuestan 100 USDT cada uno
- Total apostado: 100,000 USDT
- 40% gana (400 usuarios), 60% pierde (600 usuarios)

Sin Money Back:
- Ganadores reciben: 400 × 100 × 1.82 = 72,800 USDT
- Perdedores pierden: 60,000 USDT
- Casa gana: 100,000 - 72,800 = 27,200 USDT

Con Money Back:
- Ganadores reciben: 72,800 USDT (con margen)
- Perdedores recuperan: 60,000 USDT
- Casa paga: 72,800 + 60,000 = 132,800 USDT
- PERO: La casa RECIBE 100,000 + necesita 32,800 extras de reserva

¿Cómo gana entonces?
- El margen (10%) hace que los ganadores reciban MENOS de lo justo
- A largo plazo, el margen acumulado supera los reembolsos
- Usuarios fieles: Vuelven a apostar el dinero devuelto
```

### 1Win (Sistema Tradicional)

1Win NO usa money back. Usa el modelo tradicional:

```
- Cuotas con margen: Similar (5-10%)
- Perdedores pierden TODO
- Casa gana: Todas las apuestas perdedoras + margen de las ganadoras

Ejemplo:
- Total apostado: 100,000 USDT
- Ganadores reciben: ~72,800 USDT (con margen)
- Perdedores pierden: 60,000 USDT (CASA SE QUEDA CON TODO)
- Ganancia casa: 60,000 + 27,200 = 87,200 USDT
```

**Ventajas de 1Win:** Más ganancia directa
**Desventajas:** Menos atractivo para usuarios, menos retención

**Ventajas de u91/Bets Pro:** 
- Usuarios no pueden perder todo
- Mayor retención
- Usuarios vuelven a apostar el reembolso
- Ganancia a largo plazo por volumen

---

## Configuración Recomendada

### Depósitos

| Parámetro | Valor Recomendado | Razón |
|-----------|------------------|-------|
| Min Deposit | 10 USDT | Bajo umbral, más usuarios |
| Max Deposit | Sin límite | Dejar fluir |

### Apuestas

| Parámetro | Valor Recomendado | Razón |
|-----------|------------------|-------|
| Min Bet | 1 USDT | Accesible para todos |
| Max Bet | 50-100 USDT | Limita exposición |
| Max Payout | 200 USDT | Protege la reserva |

### Money Back

| Parámetro | Valor | Razón |
|-----------|-------|-------|
| Activado por defecto | Sí | Modelo u91 |
| Desactivable | Sí | Si quieres modelo tradicional |

---

## Cálculo de Exposición

El tab "Exposure" en Admin muestra:

### Por Partido:

```
Total Apostado: 500 USDT
├── Apuestas Resultado: 350 USDT
│   ├── Home: 150 USDT
│   ├── Draw: 50 USDT
│   └── Away: 150 USDT
└── Apuestas Goles: 150 USDT
    ├── Home Over 0.5: 50 USDT
    ├── BTTS Yes: 50 USDT
    └── Total Over 1.5: 50 USDT

Escenarios:
- Si Home gana: Pays 150×1.82 + goal wins = ~X USDT
- Si Draw: Pays 50×3.64 + goal wins = ~Y USDT
- Si Away gana: Pays 150×1.82 + goal wins = ~Z USDT

Worst Case: El escenario que más paga (mayor pérdida para casa)
```

### Exposición Total:

```
Suma de todos los "peores casos" de cada partido abierto
= Máximo que podría perder la casa si todo sale mal
```

---

## Fórmulas Clave

### Ganancia de Casa en Apuesta Ganadora:

```
Ganancia = Apuesta × (1 - 1/CuotaMostrada)

Ejemplo:
- Apuesta: 100 USDT
- Cuota: 1.82
- Ganancia = 100 × (1 - 1/1.82) = 100 × 0.45 = 45 USDT implícitos
```

### Margen Implícito:

```
Margen = (Suma probabilidades - 1) × 100

Ejemplo:
- Home: 1/1.82 = 54.95%
- Draw: 1/3.64 = 27.47%
- Away: 1/1.82 = 54.95%
- Suma: 137.37%
- Margen = 37.37% (demasiado alto, normal es 5-10%)
```

### Cuota Justa:

```
CuotaJusta = 1 / ProbabilidadReal
CuotaMostrada = 1 / (ProbabilidadReal × (1 + Margen))
```

---

## Ejemplo Completo: Partido Real Madrid vs Barcelona

### Cuotas Reales (sin margen):

| Resultado | Probabilidad | Cuota Real |
|-----------|-------------|------------|
| Real Madrid | 45% | 2.22 |
| Empate | 28% | 3.57 |
| Barcelona | 27% | 3.70 |

### Cuotas Mostradas (10% margen):

| Resultado | Prob. Ajustada | Cuota Mostrada |
|-----------|---------------|----------------|
| Real Madrid | 49.5% | 2.02 |
| Empate | 30.8% | 3.25 |
| Barcelona | 29.7% | 3.37 |

### Apuestas Recibidas:

```
Total: 10,000 USDT
- Real Madrid: 4,000 USDT @ 2.02
- Empate: 2,000 USDT @ 3.25
- Barcelona: 4,000 USDT @ 3.37

Posibles Pagos:
- Real Madrid gana: 4,000 × 2.02 = 8,080 USDT
- Empate: 2,000 × 3.25 = 6,500 USDT
- Barcelona gana: 4,000 × 3.37 = 13,480 USDT

GANANCIA/PERDIDA:
- Real Madrid gana: 10,000 - 8,080 = +1,920 USDT ✓
- Empate: 10,000 - 6,500 = +3,500 USDT ✓
- Barcelona gana: 10,000 - 13,480 = -3,480 USDT ✗

Worst Case: -3,480 USDT si gana Barcelona
```

### Con Money Back:

```
Si Barcelona gana:
- Ganadores: Reciben 13,480 USDT
- Perdedores (Real Madrid + Empate): Reciben 6,000 USDT de vuelta
- Total pagado: 13,480 + 6,000 = 19,480 USDT
- Casa necesita: +9,480 USDT de reserva

Pero espera... ¿de dónde sale ese dinero?

Fondo de Reserva:
- La casa mantiene un reserve (ej: 5,000 USDT)
- El margen acumulado de apuestas anteriores cubre pérdidas puntuales
- A largo plazo, más ganancias que pérdidas
```

---

## Estrategia para Maximizar Ganancias

### 1. Limitar Apuestas Máximas

```
Max Bet: 50-100 USDT
Max Payout: 200 USDT

Por qué:
- Limita exposición máxima por apuesta
- Evita que un solo usuario te quiebre
- Distribuye riesgo
```

### 2. Balancear Cuotas

```
Nunca poner cuotas demasiado desbalanceadas:
- Máximo: 4.00 (implementado en auto-odds)
- Mínimo: 1.30

Por qué:
- Cuotas altas = pagos altos si gana
- Cuotas balanceadas = casas siempre ganan algo
```

### 3. Monitorear Exposición

```
Daily Check:
1. Ver tab Exposure en Admin
2. Si exposición total > reserva → cerrar apuestas
3. Ajustar cuotas para balancear
```

### 4. Activar Money Back SIEMPRE

```
Ventajas:
- Usuario confía más
- No pueden perder todo
- Vuelven a apostar el reembolso
- Margen acumulado cubre costos

Desventajas:
- Menor ganancia por apuesta individual
- Necesitas reserva para picos
```

---

## Resumen para elDueño

### ¿Cómo gano dinero?

1. **Margen en cuotas:** Todos ganan MENOS de lo justo
2. **Money Back:** Perdedores no pierden todo, pero...
3. **...el margen ya se quedó cuando ganaron otros**
4. **Volumen:** Más usuarios = más margen acumulado

### ¿Qué debo monitorear?

| Métrica | Frecuencia | Acción si |
|---------|------------|-----------|
| Exposición Total | Diario | > Reserva → Cerrar apuestas |
| Depósitos vs Retiros | Semanal | Retiros > Depósitos → Revisar |
| Apuestas por partido | Diario | Muy pocas → Mejorar marketing |
| Cuotas altas | Al importar | >4.00 → Ajustar manualmente |

### ¿Qué NO hacer?

1. ❌ No poner cuotas >4.00 (puedes perder mucho)
2. ❌ No permitir apuestas >500 USDT (exposición alta)
3. ❌ No ignorar exposición (puedes quedar en números rojos)
4. ❌ No desactivar Money Back sin entender cómo afecta retención

---

## Archivos Clave del Sistema

| Archivo | Función |
|---------|---------|
| `app/api/admin/bulk-odds/route.ts` | Auto-odds con máx. 4.00 |
| `app/api/admin/autoclose/route.ts` | Cierra partidos >30 mins |
| `app/api/admin/exposure/route.ts` | Calcula exposición total |
| `app/api/admin/matches/[id]/route.ts` | Settle + money back |
| `app/api/bet/place/route.ts` | Valida apuestas |
| `models/Match.ts` | goalOdds, moneyBack |
| `models/Bet.ts` | selection, multiplier |

---

**FIN**