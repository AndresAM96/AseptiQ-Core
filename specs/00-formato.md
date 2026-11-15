---
id: 00-formato
status: approved
version: 1.0
last_updated: 2026-11-15
---

# Formato de specs

## 1. Estructura de carpetas

```text
specs/
├── 00-vision.md
├── 00-formato.md
├── 01-actores-y-casos-de-uso.md
├── 02-requisitos-funcionales.md
├── 03-modelo-de-dominio.md
├── 04-requisitos-no-funcionales.md
├── 05-contratos.md
├── 06-ui-y-experiencia.md
├── 07-criterios-de-aceptacion.md
├── 08-plan-de-reconstruccion.md
└── _template.md
```

## 2. Frontmatter obligatorio

Todo spec empieza con:

```yaml
---
id: RF-INS-001
status: draft | review | approved | deprecated
version: 0.1
last_updated: YYYY-MM-DD
depends_on: [IDs]
tags: [insumos, validacion]
---
```

## 3. Convención de IDs

| Prefijo | Tipo | Ejemplo |
| :--- | :--- | :--- |
| `RF-<MOD>-###` | Requisito funcional | `RF-INS-001` |
| `RNF-<AREA>-###` | Requisito no funcional | `RNF-SEC-001` |
| `CU-###` | Caso de uso | `CU-010` |
| `CA-###` | Criterio de aceptación | `CA-001` |
| `MD-<ENT>-###` | Modelo de dominio | `MD-INS-001` |
| `CT-<AREA>-###` | Contrato (API, evento) | `CT-RPC-001` |

`<MOD>` = código de módulo: `AUD`, `BCK`, `CFG`, `COM`, `CON`, `COS`, `DES`, `DEV`, `ENT`, `EVA`, `HIS`, `INS`, `KAR`, `MER`, `ORD`, `PRD`, `PRG`, `PRO`, `REN`, `TRZ`, `USU`.

## 4. Formato de requisito funcional

```markdown
## RF-INS-001 — Código único de insumo

**Requisito (EARS-lite):**
> Cuando el operador crea un insumo, el sistema debe validar que el código no exista antes de confirmar la creación.

**Reglas:**
- Formato: `INS-` + 4 dígitos.
- ...

**Criterios de aceptación:**
- **CA-001.** Dado ..., cuando ..., entonces ...
- **CA-002.** Dado ..., cuando ..., entonces ...

**Dependencias:** RF-INS-000
**Notas:** ...
```

## 5. Formato de criterio de aceptación (Gherkin-lite)

```markdown
**CA-###.** Dado <contexto>, cuando <acción>, entonces <resultado esperado>.
```

Sin `Feature` ni `Scenario` de Cucumber: un solo párrafo por criterio.

## 6. Estados

- `draft`: en redacción, no validado.
- `review`: listo para revisión.
- `approved`: validado, sirve de base para implementación.
- `deprecated`: reemplazado por otro spec.

## 7. Trazabilidad

Cada `CA-###` debe poder convertirse en:
- Un test de Vitest (`tests/core/`, `tests/modules/`).
- Un test manual documentado en `07-criterios-de-aceptacion.md`.

El commit que implementa un `RF-###` debe referenciar el ID en el mensaje:

```text
feat(insumos): RF-INS-001 validar código único
```