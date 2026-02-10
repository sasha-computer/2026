Q: In a programming language, what represents simple ideas?
A: Expressions.

Q: How are expressions combined into compound ideas in a programming language?
A: By applying a procedure to expressions to form a *combination* (compound expression).

Q: What mechanism in a programming language allows compound elements to be named and manipulated as single units?
A: Abstraction.

Q: What is the definition of a combination?
A: Expressions, combined together with a procedure application, form a compound expression known as a *combination*.

Q: You sit down at a terminal and type an *expression*. How does the interpreter respond?
A: It displays the result of the *evaluation* of the *expression*.

Q: Why is the relationship between 'expression' and 'evaluation' circular?
A: An expression is defined as something that can be evaluated, and evaluation is  something that happens to expressions.

C: `(define x 3)` is an example of a [special form] in Lisp

Q: Give a definition for what constitutes the syntax of a programming language.
A: The set of all valid expressions and their associated evaluation rules.

Q: Define *Procedure*
A: A programmatic description of a *process*.

Q: Define *computational process*
A: 
- A *computational process* is a dynamic being which **evolves**. 
- This **evolution** follows rules laid out in a *computer program*.

C: Processes manipulate [data] as they [evolve].

Q: What is the title of the seminal paper that established Lisp? Author + year of publication?
A: 
- *Recursive Functions of Symbolic Expressions and Their Computation by Machine*
- John McCarthy, 1960

Q: What concepts did *McCarthy* introduce in his 1960 seminal paper?
A: 
- *S-expressions*: Symbolic Expressions
- *Recursion*: The primary control structure
- *The Universal Function*: A Lisp interpreter defined *in Lisp*.

Q: What is the value of the *operator* in a *combination*?
A: The procedure to be applied to the values of the *operands*, or *arguments.*

Q: What is the etymological root of the term *argument* (computing)?
A: From Latin, ***argumentum***: "evidence" or "proof"

Q: How would an astronomer from the 14th century use the term: *argument*?
A: As a value (date) in a lookup table (say for a planet’s prediction position.)

Q: What is a *Symbolic Expression*?
A: Notation for nested lists using parentheses.

C: In Lisp, an S-expression is defined as an [atom] or as an [expression] which itself contains [S-expressions]. 

Q: What is the *substitution model* for procedure application?
A: An model that determines the “meaning” of procedure application.

Q: What two types of evaluation models for the Lisp interpreter are introduced?
A: 
- Applicative order evaluation
- Normal order evaluation

Q: Describe *normal-order evaluation*
A: 
- *“Fully expand then reduce”*

Q: Describe *applicative-order evaluation*
A:
- *"Evaluate the arguments then apply"*

Q: Which evaluation order is described as 'fully expand then reduce'?
A: Normal-order evaluation.

Q: Which evaluation order is described as 'evaluate the arguments then apply'?
A: Applicative-order evaluation.

Q: Explain the difference between "the substitution model" and "applicative-order/normal-order evaluation". 
A: 
- The substitution model is the general model for how we apply a procedure: by substituting parameters with arguments. 
- Applicative/Normal order are the specific strategies describing when substitution occurs.

Q: What is a *predicate*?
A: An expression or procedure whose value is *either* true or false.

C: If none of the predicates in a Lisp conditional are found to be true, the value of the `cond` is [undefined]

Q: Give the general form of the `if` special form in Lisp
A: (if “predicate” “consequent” “alternative“)

Q: Give three examples of *primitive predicates* in Lisp.
A: 
```lisp
< > =
```

Q: What is meant by the phrase “procedures as black box abstractions” from the perspective of the user of the procedure?
A: The user does not need to know how the procedure is implemented to be able to use it.

C: The names bound to parameters of a procedure must be [local] to the body of the procedure.

Q: Define the *scope* of a name
A: The set of expressions, for which the binding of a formal parameter to a name is active, is **the scope** of this name. 

C: If a variable name is not [bound], it is [free].

C: In a procedure definition, the bound variables declared as the formal parameters of the procedure have the [body] of the procedure as the scope. 

Q: What does *lexical scoping* mean?
A: Free variables in a procedure must refer to bindings made in parent procedure definitions.

---

###1.2 Procedures and the Processes They Generate

C: Imperative knowledge provides a [specific sequence of steps] to produce a result.

Q: What is the defining characteristic of the shape of a “recursive process”?
A: A chain of **deferred operations**. Expansion then contraction. 

Q: What is the defining characteristic of the shape of an “iterative process”?
A: A constant shape defined by a fixed number of **state variables**.

Q: State succinctly the workflow of *tail recursion*
A: Do work, then recurse.

Q: State succinctly the workflow of *head recursion*
A: Recurse, then do the work. 

Q: In *tail recursion*, the recursive call is in the tail position, meaning it is the…
A: last thing the procedure does before returning a value.

Q: In *head recursion*, the recursive call is in the head position, meaning it is the…
A: first thing the procedure does.

Q: If a recursive call is not in the tail position (head/middle) what type of process does it generate? Why?
A: A recursive process, due to deferred operations after the recursive call. 

Q: How does the memory usage of a *linear recursive process* scale with $n$?
A: $O(n)$ - linearly.

Q: How does the memory usage of a *linear iterative process* scale with $n$?
A: 
- $O(1)$ - constant space. 
- Note: *Linear* refers to *time* not *memory*.

C: Realising a recursive process requires a machine that uses an auxiliary data structure known as a [stack].

Q: In SICP, what does the specific term *tail-recursive* refer to?
A: The language implementation i.e. interpreter; the language is capable of executing an iterative process in constant space.

Q: What is the SICP term for what standard CS calls a “Tail Recursive Algorithm”?
A: An iterative process.

Q: What is the SICP term for what standard CS calls “Head/General Recursion”?
A: A recursive process.

Q: Contrast a *recursive process* with an *iterative process* in terms of:
- The mechanism of evolution
- Memory usage
- Restartability
A: 
- **Mechanism**: 
	- Recursive uses a chain of deferred operations.
	- Iterative uses state variable updates.
- **Memory**:
	- Recursive grows linearly (stack).
	- Iterative uses constant space.
- **Restartability**:
	- Iterative can be restarted with current state variables.
	- Recursive cannot be easily restarted as state is hidden in the stack.

Q: What is the general form of a conditional expression in Lisp?
A: 
$$
\begin{array}{rl}
(\textsf{\textbf{\color{#4F76AC}cond}} & (\langle p_1 \rangle \ \langle e_1 \rangle) \\
& (\langle p_2 \rangle \ \langle e_2 \rangle) \\
& \dots \\
& (\langle p_n \rangle \ \langle e_n \rangle))
\end{array}
$$
Q: What does a clause refer to in a conditional expression in Lisp?
A: 
$$
(\langle p \rangle \ \langle e \rangle)
$$

Q: Explain what a clause $(\langle p \rangle \ \langle e \rangle)$ in a conditional expression consists of?
A: A clause is a parenthesized pair of expressions where the first is a *predicate* and the second is the *consequent expression*.

Q: When is a *consequent expression* evaluated in a conditional expression in Lisp?
A: When its corresponding *predicate* returns true.

Q: In a tree-recursive process, the number of **steps** (time) is proportional to what?
A: The total number of nodes in the tree.

Q: Which complexity metric depends on the **total number of nodes** in a recursive tree?
A: Time (steps).

Q: Which complexity metric depends on the **maximum depth** of a recursive tree?
A: Space (memory).

Q: Why is tree-recursive time complexity proportional to the number of nodes?
A: Because the process must visit and execute every note in the tree exactly once.

Q: In a tree-recursive process, the **space** (memory) required is proportional to what?
A: The maximum depth of the tree.

Q: Why is tree-recursive space complexity only proportional to the maximum depth and not the total nodes?
A: Because the interpreter only needs to store the stack frames for the single branch currently being processed, not the whole tree.

Q: When we talk about the "number of steps" a process takes, what complexity are we referring to? 
A: Time complexity.

Q: When we talk about the "amount of space" a process needs, what complexity are we referring to?
A: Space complexity.

Q: What does **Time Complexity** measure in a recursive process?
A: The number of steps required.

Q: What does **Space Complexity** measure in a recursive process?
A: The maximum amount of memory (stack frames) stored at any one time.

Q: What type of data are tree-recursive processes really good at dealing with?
A: Arbitrarily deep nested data structures.

Q: What is a prime example of a tree-recursive process found inside the Scheme language itself?
A: The **evaluator** (or interpreter).

Q: What process shape is naturally suited for traversing arbitrarily deep, nested data?
A: Tree recursion.

Q: Why is tree recursion good for nested data structures?
A: Because the data's shape (branches of branches) mirrors the process's shape.

Q: What kind of process does the Scheme interpreter use to evaluate expressions?
A: A tree-recursive process.

Q: Why is expression evaluation tree-recursive?
A: Because expressions contain subexpressions, which may contain more subexpressions — evaluation must follow this nested structure.

Q: What is a *control structure* in programming?
A: A construct that determines how execution flows from one statement to the next.

Q: Why was recursion the *primary* control structure in McCarthy's 1960 Lisp?
A: Lisp had no imperative loops (while, for). Recursion was the sole mechanism for expressing repetition.

Q: What two control structures did McCarthy introduce in his 1960 Lisp paper?
A:
- **Conditional expressions** (`cond`) - for branching
- **Recursion** - for repetition

Q: What are *primitive expressions* in Lisp?
A: Atomic syntactic entities: self-evaluating expressions (numbers, strings) and names (symbols looked up in the environment, including `+`, `x`, etc.).

Q: What does it mean for primitive expressions to be "atomic"?
A: They cannot be decomposed into subexpressions - they are irreducible.

Q: What type of expression cannot be decomposed into subexpressions?
A: Primitive expressions.

Q: In the tree structure of a Lisp expression, what are primitive expressions?
A: The leaves - they have no subexpressions (children).

Q: What distinguishes primitive expressions from combinations and special forms?
A: Primitive expressions are atomic (no subexpressions); combinations and special forms are compound (contain subexpressions).

Q: How does Lisp evaluate combinations (using applicative order)?
A:
1. Evaluate all subexpressions
2. Apply the procedure (leftmost value) to the arguments (remaining values)

Q: What is a *special form* in Lisp?
A: A combination that has its own evaluation rule.

Q: Why doesn't `(define x 3)` evaluate `x` before binding?
A: Because `define` is a special form - it has its own evaluation rule that treats the first argument as a name to bind, not an expression to evaluate.

C: The three types of expressions in Lisp are [primitive expressions], [combinations], and [special forms].

---

### Programming Paradigms

Q: What is *imperative programming*?
A: A programming paradigm that uses statements to change a program's state, describing *how* a program operates step by step.

Q: What is the etymological connection between "imperative programming" and natural language?
A: The term comes from the *imperative mood* in natural languages, which expresses commands - imperative programs consist of commands for the computer to perform.

Q: What is *declarative programming*?
A: A programming paradigm that focuses on *what* the program should accomplish, without specifying all the details of *how* to achieve the result.

Q: How do imperative and declarative programming differ in focus?
A:
- **Imperative**: describes *how* - step-by-step instructions
- **Declarative**: describes *what* - the desired result

Q: What is *procedural programming*?
A: A type of imperative programming built from procedures (subroutines or functions).

C: Procedural programming is a type of [imperative] programming that uses [procedures] (also called subroutines or functions).

Q: What Latin root do 'statement' and 'state' share?
A: 'stare' - to stand, to be fixed in position.

Q: In programming, what does 'state' mean etymologically?
A: Where the program currently 'stands' - its condition at a point in time.

C: 'Statement' and 'state' both derive from Latin [stare] (to stand).

---

### Lisp History

C: LISP is an abbreviation of "[list processing]"

Q: What distinctive notation does Lisp use?
A: Fully parenthesized prefix notation.

Q: What is the second-oldest high-level language still in common use?
A: Lisp (after Fortran).

Q: What is the oldest high-level language still in common use?
A: Fortran (late 1950s).
