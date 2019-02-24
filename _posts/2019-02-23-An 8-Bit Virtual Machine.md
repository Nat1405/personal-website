---
layout: post
title: An 8-bit Virtual Architecture
---

I decided it might be fun to build a virtual architecture to calculate fibonacci numbers. I'm pretty excited about it; I've always wondered how hard it could be to design your own architecture entirely from scratch.

## Implentation in a high level language
Basically, the first thing I started with was implementing fibonacci in C. Easy enough, right?

```c
#include <stdio.h>
#include <stdlib.h>

int fib(int n){
	/* Calculate the nth fibonaci number */
	int a, b, i, tmp;
	a = 1;
	b = 1;
	if (n==1 || n==2) return 1;
	for (i=2; i<n; i++){
		tmp = b;
		b = a+b;
		a = tmp;
	}
	return b;
}


int main(){
	for (int i=1; i<10; i++){
		printf("Fib number %d is %d.\n", i, fib(i));
	}
	return 0;

}
```
## Translation to Assembly
I then discovered the wonderful gcc flag -S, to spit out assembly. This means we can generate assembly with `gcc fib.c -S`. Super cool right!

This spit out a fib.s file that looks like:

```x86
	.section	__TEXT,__text,regular,pure_instructions
	.build_version macos, 10, 14
	.globl	_fib                    ## -- Begin function fib
	.p2align	4, 0x90
_fib:                                   ## @fib
	.cfi_startproc
## %bb.0:
	pushq	%rbp
	.cfi_def_cfa_offset 16
	.cfi_offset %rbp, -16
	movq	%rsp, %rbp
	.cfi_def_cfa_register %rbp
	movl	%edi, -8(%rbp)
	movl	$1, -12(%rbp)
	movl	$1, -16(%rbp)
	cmpl	$1, -8(%rbp)
	je	LBB0_2
## %bb.1:
	cmpl	$2, -8(%rbp)
	jne	LBB0_3
LBB0_2:
	movl	$1, -4(%rbp)
	jmp	LBB0_8
LBB0_3:
	movl	$2, -20(%rbp)
LBB0_4:                                 ## =>This Inner Loop Header: Depth=1
	movl	-20(%rbp), %eax
	cmpl	-8(%rbp), %eax
	jge	LBB0_7
## %bb.5:                               ##   in Loop: Header=BB0_4 Depth=1
	movl	-16(%rbp), %eax
	movl	%eax, -24(%rbp)
	movl	-12(%rbp), %eax
	addl	-16(%rbp), %eax
	movl	%eax, -16(%rbp)
	movl	-24(%rbp), %eax
	movl	%eax, -12(%rbp)
## %bb.6:                               ##   in Loop: Header=BB0_4 Depth=1
	movl	-20(%rbp), %eax
	addl	$1, %eax
	movl	%eax, -20(%rbp)
	jmp	LBB0_4
LBB0_7:
	movl	-16(%rbp), %eax
	movl	%eax, -4(%rbp)
LBB0_8:
	movl	-4(%rbp), %eax
	popq	%rbp
	retq
	.cfi_endproc
                                        ## -- End function
	.globl	_main                   ## -- Begin function main
	.p2align	4, 0x90
_main:                                  ## @main
	.cfi_startproc
## %bb.0:
	pushq	%rbp
	.cfi_def_cfa_offset 16
	.cfi_offset %rbp, -16
	movq	%rsp, %rbp
	.cfi_def_cfa_register %rbp
	subq	$16, %rsp
	movl	$0, -4(%rbp)
	movl	$1, -8(%rbp)
LBB1_1:                                 ## =>This Inner Loop Header: Depth=1
	cmpl	$10, -8(%rbp)
	jge	LBB1_4
## %bb.2:                               ##   in Loop: Header=BB1_1 Depth=1
	movl	-8(%rbp), %esi
	movl	-8(%rbp), %edi
	movl	%esi, -12(%rbp)         ## 4-byte Spill
	callq	_fib
	leaq	L_.str(%rip), %rdi
	movl	-12(%rbp), %esi         ## 4-byte Reload
	movl	%eax, %edx
	movb	$0, %al
	callq	_printf
	movl	%eax, -16(%rbp)         ## 4-byte Spill
## %bb.3:                               ##   in Loop: Header=BB1_1 Depth=1
	movl	-8(%rbp), %eax
	addl	$1, %eax
	movl	%eax, -8(%rbp)
	jmp	LBB1_1
LBB1_4:
	xorl	%eax, %eax
	addq	$16, %rsp
	popq	%rbp
	retq
	.cfi_endproc
                                        ## -- End function
	.section	__TEXT,__cstring,cstring_literals
L_.str:                                 ## @.str
	.asciz	"Fib number %d is %d.\n"


.subsections_via_symbols
```

Now, I have no idea how to read x86 at this point. I tried to compile to something friendlier like MIPS or AVR assembly but that might have to wait. Cross compilation looks scary!

## My Instruction Set Architecture

I'm having a really hard time designing an ISA for an 8-bit system. What gave me a really hard time is the beq instruction and the add instruction. I'm giving it a whirl with two bits for the opcode and 6 bits for the operands for now.

I have a lot more respect for folks who programmed 8-bit processors.

```ASM
		// r0: a, r1: b, r2: tmp, r3:n


		ldi r3, n // int n = n
		ldi r0, 1 // int a = 1
		ldi r1, 1 // int b = 1
		ldi r2, 1 // int tmp = 1

		cmp r2, r3 // tmp == n == 1?
		bze RETURN_1

		ldi r2, 2 // tmp = 2
		cmp r2, r3 // tmp == n == 2?
		bze RETURN_2

		ldi r2, -2
		add r2, n  // n = n - 2

LOOP:   ldi r2, 0
		add r2, r2, r1  // tmp = b
		add r1, r0, r1
		ldi a, 0
		add r0, r0, r2  // a = tmp
		ldi r2, -1		
		add r3, r3, r2// Decrement n
		ldi r2, 0
		cmp r3, r2
		bze DONE
		cmp r3, r3
		bze LOOP     // Get around not having BNEQ :')


RETURN_1:ldi r3, 1
		cmp r2, r2
		bze DONE

RETURN_2:ldi r3, 2
		cmp r2, r2
		bze DONE


RETURN_B:ldi r3, 0
		add r3, r1, r3 // Return result in reg n was passed in in
		cmp r2, r2
		bze DONE

DONE:	


```

The hard thing is the add instruction needs three (it doesn't actually, can you see why?) instructions so that takes up six bits. Therefore we're limited to 2 bits for the opcode and 2 bits for each of the registers. However, by being clever with ldi (ldi is fantastic!!) and branches I believe I might have some workable assembly.

My first draft ISA is therefore:

```
-LDI <destination register>, <4 bit immediate>
-CMP <register A>, <register B> (Sets zero flag on ALU)
-BZE <immediate address offset> (PC = PC + offset if ALU[zero])
-ADD <destination register>, <register A>, <register B> (dest = A + B)

```

Four instructions for fibonnaci, not bad!!


