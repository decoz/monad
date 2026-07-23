[English](README.md) | [한국어](README.kr.md)

---

# 🌌 MONO (Monad Object Notation) Official Specification

> **"Destroy types, unify the universe with pure Paths and Context."**
> MONO is an ultra-lightweight, typeless data and document representation standard. It eliminates the overhead and complexity of traditional type checking (found in JSON/YAML) by directly inheriting the natural object access notation (`object.property`) right at the definition phase.
> 
> 

---

## 🏛️ 1. The 3 Core Philosophies of MONO

1. **Pure Typelessness**
* There are no fixed, explicit types such as `String`, `Int`, or `Boolean`.


* All data exists solely through **'Links'** and **'Context'**. (For instance, `25` is not an integer; it is simply a data segment linked behind `age`) .




2. **Structural Defense**
* Rejects compile-time inspection of internal content (Type Checking).


* Guards the system against data chaos purely through the tree's **'Shape'** and **'Constraint'**.




3. **Homoiconicity (Unification of Code and Data)**
* Data structures and executable code structures are 100% identical.


* Data itself becomes an executable instruction (e.g., `( run.print, print.message.Hello )`).





---

## ✍️ 2. Syntax & Notation Specs

MONO supports a **Hybrid Format** to adapt seamlessly to different environments.

### ① Block Notation (`.mn`)

* 
**Primary Use:** Human editing, readability-focused `.mn` files.


* 
**Rule:** Omits parentheses `()` and commas `,`, expressing depth/hierarchy using **newlines** and **tab-indents**.


* 
**Ambiguous Literal Handling:** Any string containing whitespace or dots (`.`) is wrapped in quotes `""` to force the parser to absorb it as a raw literal string.



```mono
user
	#id	alice
	name	"Hong Gil Dong"
	skills
		Python
		JS

```

### ② Inline Notation

* 
**Primary Use:** Ultra-lightweight network packet transmission, single-line configuration.


* 
**Rule:** Uses tuple nodes with parentheses `()` and commas `,`.


```mono
( user.#id.alice, user.name."Hong Gil Dong" )

```



---

## 🛡️ 3. Data Storage & Query Rules

### ① Map-ification & Implicit Indexing

* 
**Deterministic Path Rule:** Every single piece of data maintains a uniquely addressable path in memory.


* 
**Duplicate Traversal:** When duplicate entries exist under the same path (List structure), the parser automatically converts them into an **Indexed Map** (e.g., `user.skills[0]`, `user.skills[1]`).



### ② Explicit Key vs. Order Index Queries (`a.1` vs `a[1]`)

To eliminate ambiguity when querying numbers, explicit path keys are strictly distinguished from order indices.

| Query Expression | Behavior | Example (Given `a` has explicit key `"1"` and leaf node `"d"`) |
| --- | --- | --- |
| **`a.1`** | Direct query for a child node with the explicit key/name `"1"` 

 | Returns `"1"` 

 |
| **`a[1]`** | Query by position for the **1st index** (2nd child node) regardless of name 

 | Returns `"d"` 

 |

```javascript
// JavaScript Mono class query usage
const data = new Mono("a((b,c), d)");
data.get("[0].[0]").value; // "b"
data.get("[1]").value;    // "d"

```

### ③ Sub-tree Return Rule

* Querying an intermediate path (e.g., `get("user.skills")`) will never throw an error; instead, it returns the entire **Sub-tree (Indexed Map)** originating from that node.


* 
**Error Triggers:** Errors are thrown **only** when querying a non-existent path or when violating a required constraint (`!`).



---

## 🏷️ 4. Guard Tokens

Special prefix symbols are attached to nodes to enforce structural constraints and immutability.

* 
`!` **(Required Constraint):** Enforces that a value or child structure MUST exist beneath this node.


* 
`#` **(Unique/Constant Constraint):** Defines a unique Map key space; prevents duplicates and guarantees immutability.


* 
`@` **(Tag/Style Attribute):** Assigns a visual context tag or metadata attribute to a node.



---

## 🎨 5. Multi-Dimensional Extension (MonoDoc & Raw Block)

An architecture designed to replace Markdown by unifying text, structured data, and visual presentation into a single model.

```mono
meta
	title	"MONO Architecture"

style
	body.p	size.14
	@alert	color.red

body
	p	"Applies base style according to depth level"
	p@alert	"Overlays red style projected from style.@alert"

```

1. **Multi-dimensional Style Projection**
* 
**Base Layer Rules:** The depth/level of a node serves directly as a layout rule (e.g., Depth level 2 defaults to `font-size: 15px`).


* 
**Overlay Tag Rules:** Attribute tags like `@alert` link the body node to an independent style dimension (`style.@alert`) via **Quantum Entanglement (Linking)** for dynamic rendering overlay.




2. **Raw Block Absorption**
* Inherits the header/buffer separation philosophy of OpenCV's `Mat` structure to solve the "Curse of Dimensionality" in large matrices, images, or tables.


* The MONO tree explicitly declares only the dimensional metadata (`shape.2x2`), while absorbing thousands of raw pixels or tabular fields into a **single continuous byte/literal block** for high-speed offset indexing.