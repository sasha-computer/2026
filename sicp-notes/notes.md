---
Source: "[[SICP-Abelson-2007.pdf]]"
Month: "[[2026-01]]"
---
## Chapter 1: Building Abstractions with Procedures

### 1.0 Introduction

*define: Procedure*
- A programmatic description of a *process*.
- Context:
	> ... Lisp descriptions of processes, called **procedures**, can themselves be represented and manipulated as Lisp data. *pg.5*
	> handling procedures as data... *pg.5*

*define: (computational) Process*
- A computational process is a dynamic "being" which evolves with (clock?) time.
- This evolution follows strict rules; these rules are laid out in a *program*.
- Processes manipulate *data* as they evolve.

- Lisp was invented in the 1950s: 
	- [*"Recursive Functions of Symbolic Expressions and Their Computation by Machine."*][recursive_lisp.pdf]
	- That is one damn aesthetic paper title! Reminds me of the retro company titling i.e. "Taiwan Semiconductor Manufacturing Company"
- "Lisp" comes from "**LIS**t **P**rocessor".
	- Clearly, lists are *the* fundamental object of Lisp. 

### 1.1 The Elements of Programming 

> A programming language serves as a framework within which we organize our ideas about processes. *pg. 6*

- Q: How does a programming language provide the ability to combine simple ideas into complex ones?
- A: *Expressions* represent simple ideas. *Combinations* combine expressions into compound ideas. *Abstraction* allows for compound ideas to be named and manipulated as single units.

#### 1.1.1 Expressions

- see [[Symbols or Atoms]]

*define: Expression*

- It is actually quite difficult to define what an *expression* is. 
- The best way I have right now:
	- An expression is something that, *when evaluated*, returns a value. 
	- There are evaluation rules for *primitive expressions* i.e. expressions of *primitive data types*. 
	- Programming is cool as it allows for simple expressions to be combined into combinations - more complex expressions. As programmers, we define the evaluation rules for our named complex abstracted computational units.

- Q: What is the definition of a combination?
- A: Expressions, combined together with a procedure application, form a compound expression known as a *combination*.

> The value of a combination is obtained by applying the procedure specified by the operator to the *arguments* that are the values of the operands. 

- Take an example: `(+ 56 69)`
	- `+` is the operator. This operator *evaluates* to the **primitive addition procedure**. 
	- The (binary addition) operator specifies the procedure to apply to two operands. Operands are syntatic expressions that provide values *upon evaluation* for addition. 
	- The operands `56` and `69` evaluate to the numbers `56` and `69` and these numbers are passed as *arguments* to the primitive addition procedure.

- Operator -> Evaluates to -> Procedure
- Operands -> Evaluate to -> Arguments
- Procedure + Argument -> Applied to produce -> Value

> the interpreter always operates in the same basic cycle. It reads an expression from the terminal, evaluates the expression and prints the result. This mode of operation is ... a `read-eval-print loop`.

- `read-eval-print loop` or REPL.

#### 1.1.2 Naming and the Environment

- Names are used to refer to computational objects.
	- > The name identifies a *variable* whose *value* is the object.
- The interpreter keeps track of `name-object` pairs via some sort of memory.
- This memory is known as the *global environment*. 

The code below means that, from now on, the interpreter will associate the name `size` with the value `2`. 

```lisp
(define size 2)
```

To refer to combinations:

```lisp
(define pi 3.14159)
(define radius 10)
(define circumference (* 2 pi radius))
```

#### 1.1.3 Evaluating Combinations

- see [[Symbolic Expressions]]

When evaluating combinations, the interpreter follows a procedure:

1. Evaluate all subexpressions of the combination (*recursive call*)
2. Apply the procedure that is the value of the leftmost subexpression, *the operator*, to the arguments that are the values of the other subexpressions, *the operands.*

For *primitive operators*, they evaluate to procedures. These procedures take arguments, which are the values of the *operands* in the expression.

##### Evaluating Primitive Expressions

At some point during step 1. of the procedure to evaluate combinations, an evaluation of a primitive expression will have to occur; this also follows a procedure:

1. The value of digits is the number that they name i.e. `65` gives the value of decimal `65` on evaluation.
2. The value of other names is the the object associated with those names in the environment - [[#1.1.2 Naming and the Environment]].
	1. A special rule here is the "built-in" operators for the interpreter like `+` or `*`. These are names that evaluate to procedures as the values. These procedures are sequences of machine instructions to carry out these built-in operations.

**Remember, the point of evaluation is to "grab" the value associated with the expression and to do something with that value.**

> [!Special Case]
> ```lisp
> (define x 3)
> ```
>  is a special case. It is special precisely because `x` has no value and it effectively appends the evaluation rule for `x` to the global set of evaluation rules. You can't get the value of x at this point, and so the above 2 rules can't be followed.
>  - **This is known as a *special form***. 
>  - **Each special form has its own evaluation rule. 
>  - `define` allows you to define evaluation rules for new names; this is a key part of abstraction in computing.**


- Q: `(define x 3)` is an example of a _ _ in Lisp
- A: A special form

- Q: What is a special form?
- A: An exception to the general evaluation rule for primitive expressions.

- Q: Give a definition for what constitutes the syntax of a programming language.
- A: The set of all (primitive? built-in?) expressions and their evaluation rules. 
 
#### 1.1.4 Compound Procedures

This section deals with functions in programming. For example:

```lisp
(define (square x) (* x x))
```

follows the general form of a *procedure definition*:

```lisp
(define (<name> <formal parameters>)
	<body>)
```


- "Formal Parameters" refers to the names used within the body of the function for the arguments of the procedure. 
- "Body" is an expression that will return the value of the proceddure.

- Compound Procedures, similar to compound expressions, use other procedures in their body to combine procedures together into a single unit.

#### The Substitution Model for Procedure Application

- I have switched tact, see [[2026-01-07]]; I am going to focus on writing flashcards only. Probably directly in the [[Cards/Structure and Interpretation of Computer Programs|Structure and Interpretation of Computer Programs]] deck markdown file. I think I can add headers there, without it complaining. 

- I will use this file as a scratchpad to make flashcards later; rule 1. Understand the material first, before making flashcards.
	- [[SRS-Effective-Borretti-2023#Rule Understand First]]

### 1.2 Procedures and the Processes They Generate

- There seems to be a link between what SICP calls “recursive process” and “iterative process” and what CS terms “head recursion” and “tail recursion”.

- In an iterative process, the state variables provide a *complete description* of the state of the process at any point. 
	- If we stopped the computation, we could resume it later by supplying the interpreter with the state variables.
- In a recursive process, there is some additional “hidden” information (think call stack, stack frame, stack) that the interpreter keeps track of. 
	- If we stopped the computation, we could not resume the process directly by supplying this hidden information, the interpreter would have to restart from the beginning.

- *Recursive Process*
	- Refers to the process “shape” as expanding and contracting.
- *Recursive Procedure*
	- Somewhere within a recursive procedure, a recursive procedure refers to itself.

- **A recursive procedure can generate either a recursive process OR an iterative process.** 
	- This speaks to the fact that the terms “iterative process” and “recursive process” are both referring to a *type* of recursion. 
	- Specifically:
		- “recursive process” → “head recursion”
		- “iterative process” → “tail recursion”


An interesting definition from [[RECURSION-types-geeksforgeeks-2025]] is:
- Head recursion is when the recursive call is the first statement in the recursive procedure. There is work to do after the recursion call which the interpreter needs to keep track of. 
- Tail recursion is when the recursive call is the last statement in the recursive procedure.

*Because the procedure is **not** tail-recursive (it has work to do after the recursive call returns), the stack frames cannot be discarded.*

```lisp
(define (factorial n)
	(if (= n 1) 
		1 
		(* n (factorial (- n 1)))))
```

In the code above, the very last operation is `*`, and so the recursive call is not in the  tail position. Therefore, it requires deferred operations (work done after the recursion call) and such produces a “shape” characteristic of a recursive process.

[[CONTROL-STRUCTURES-Hewitt-1976.pdf]]

#### Tree Recursion

- The Fibonacci procedure calls itself two times each time it is invoked:

	```lisp
	  (define (fib n) 
		  (cond ((= n 0) 0) 
				  ((= n 1) 1) 
				  (else (+ (fib (- n 1)) (fib (- n 2))))))
	  ```

- This means the branches of computation split into two at each level (recursive call).
- Therefore, the process uses a number of steps (time) that grows exponentially with the input.
- But, for some reason, memory (space) grows linearly with input; the space required will be proportional to the maximum depth of the tree. 
	- Once you hit a base case, you can return that value and delete the frame in the stack. 

- This is quite murky for me, why:
	- There’s a concept of a stack with frames
	- I am not sure what it means by path down, I kinda get that it returns the base case, and then continues the operation.
	- There’s a left and right thing in the sense of how it chooses to go down said paths.
	- This phrase is murky to me right now:
		- “We reuse the same memory over and over. We only ever need enough slots for the longest single chain, which is $n$.”
- Visualisations, using Gemini canvas, might be the way to go but not so sure. Calling it there for [[2026-01-08]]


- [[2026-01-09]]
## Tree Recursion

- Tree recursion occurs when a recursive procedure calls itself more than once in each invocation.
- This effectively splits computation in two (or however many times the recursive procedure calls itself), branching like a tree.
- The interpreter has to pick one (it seems that it is usually done left-to-right) and then go down that branch until a value is returned.
- There are some immediate questions about memory usage, number of steps, time etc. This will be easier to see with an example.

In the Fibonacci example, the recursive procedure is written:
```scheme
(define (fib n)
	(cond ((= n 0) 0)
		  ((= n 1) 1)
		  (else (+ fib (- n 1))
				   fib (- n 2))))))
```

Since `fib` calls itself twice within its own body, this process is tree recursive. 

- A tree with root node `fib n` will have n layers - this is illustrated by  the leftmost branch on the tree which always follows the `fib (- n 1)` call.
![[TREE-recursion-image.png]]
- Let $S(n)$ be the number of steps (= number of nodes in the tree) required to compute $fib (n)$.   
- The number of steps (number of nodes in the tree) grows exponentially with the input => each level splits into two => $2^n$

- We can rewrite the Fibonacci code above to generate an *iterative* process; a process that is fully described by a fixed number of state variables at any point during the computation and the rule to update them.
- This will be a linear iterative process.
- Therefore:
	- The number of steps in the tree-recursive Fibonacci computation grows exponentially with n. 
	- The number of steps in the iterative Fibonacci computation grows linearly with n. 

- This doesn't mean that tree-recursive processes are useless! 
- They are really good at dealing with arbitrarily deep nested data. 
	- In fact, the interpreter in Scheme uses a tree-recursive process for evalaution. 



### Problem: Counting Change

