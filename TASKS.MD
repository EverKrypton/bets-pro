# TASKS.MD - Bets Pro - Paired Betting System

## Estado: COMPLETADO ✓

### Implementaciones Realizadas

1. **Sistema Paired P2P** ✓
   - Modelo Bet actualizado con campos: `pairedWith`, `pairedAmount`, `houseEdge`, `status`
   - Nuevos estados: `open`, `matched`, `settled`, `cancelled`
   - House edge configurable (default 10%)

2. **Librería de Emparejamiento** (`lib/pairing.ts`) ✓
   - `findCounterBet()`: Busca contra-apuestas disponibles
   - `matchBet()`: Empareja apuestas automáticamente
   - `calculatePayout()`: Calcula payout con house edge

3. **API de Apuestas Normales** (`app/api/bet/place/route.ts`) ✓
   - Crea apuesta con estado `open`
   - Busca contra-apuesta automáticamente
   - Si encuentra match → estado `matched`
   - Si no → queda en `open` esperando

4. **API de Apuestas Inversas** (`app/api/bet/inverse/route.ts`) ✓
   - Mismo sistema de emparejamiento
   - Busca inverse bets opuestas

5. **Settle de Partidos** (`app/api/admin/matches/[id]/route.ts`) ✓
   - Procesa apuestas `matched`: ganador recibe pool - 10%
   - Procesa apuestas `open` (no emparejadas): house actúa como contraparte
   - House edge 10% aplicado a TODOS los payouts
   - Ganancias de la casa reportadas en respuesta

---

## Flujo del Sistema Paired

```
┌────────────────────────────────────────────────────────────┐
│                   APOSTAR (Normal/Inverse)                 │
└────────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │  Buscar Contra-Apuesta  │
              │  (selección opuesta)    │
              └─────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
      ┌───────────────┐         ┌───────────────┐
      │   MATCH!      │         │   NO MATCH    │
      │ Status:       │         │   Status:     │
      │   'matched'   │         │   'open'      │
      └───────────────┘         └───────────────┘
              │                         │
              ▼                         ▼
      ┌───────────────┐         ┌───────────────┐
      │ Emparejado    │         │ Esperando     │
      │ con otro      │         │ contra-apuesta│
      │ usuario       │         │ o house       │
      └───────────────┘         └───────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │    SETTLE DEL PARTIDO   │
              └─────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
      ┌───────────────┐         ┌───────────────┐
      │   MATCHED     │         │    OPEN       │
      │ Paired Bets   │         │ Unpaired Bets │
      └───────────────┘         └───────────────┘
              │                         │
              ▼                         ▼
      ┌───────────────┐         ┌───────────────┐
      │ Ganador recibe│         │ House actúa   │
      │ pool - 10%    │         │ como contrapar│
      │ Casa gana 10% │         │ aplica 10% edge│
      └───────────────┘         └───────────────┘
```

---

## Ventajas del Sistema

1. **Casa NUNCA pierde**
   - 10% de todas las apuestas va a la casa
   - Apuestas emparejadas: 10% del pool
   - Apuestas no emparejadas: house edge en odds

2. **Transparencia**
   - Usuarios pueden ver su apuesta emparejada
   - Sistema justo: matched bets pagan a otros usuarios

3. **Flexibilidad**
   - Funciona con apuestas normales e inversas
   - House edge configurable

---

## Webhook OxaPay - Configuración

### Merchant Key Configurada
```
OXAPAY_MERCHANT_API_KEY=DSICYC-TMFQJQ-WQSLOJ-BNRRCI
```

### Webhook URL
```
https://bets-pro.vercel.app/api/webhook/oxapay
```

### Probar con webhook.site
1. Ir a https://webhook.site
2. Copiar URL única
3. Configurar en Vercel: `NEXT_PUBLIC_APP_URL=https://webhook.site/xxxxx`
4. Crear depósito en la app
5. Enviar USDT a la dirección
6. Ver webhook llegar

### Test Local
```bash
# Iniciar servidor
npm run dev

# En otra terminal
node scripts/test-webhook.js
```

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `models/Bet.ts` | Añadidos campos paired |
| `lib/pairing.ts` | Nuevo - lógica de emparejamiento |
| `app/api/bet/place/route.ts` | Integrado sistema paired |
| `app/api/bet/inverse/route.ts` | Integrado sistema paired |
| `app/api/admin/matches/[id]/route.ts` | Settle con house edge |
| `scripts/test-webhook.js` | Nuevo - test de webhook |
| `TASKS.MD` | Documentación |

---

## Build Status
✓ Build successful (npm run build)
✓ No type errors
✓ All routes generated correctly

---

## Próximos Pasos Recomendados

1. [ ] Configurar `OXAPAY_MERCHANT_API_KEY` en Vercel
2. [ ] Verificar webhook URL en dashboard de OxaPay
3. [ ] Probar depósito real con webhook.site
4. [ ] Test del sistema paired con apuestas reales
5. [ ] Monitorear logs de settle para verificar house edge