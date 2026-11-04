#!/usr/bin/env python3
"""Regra "nenhum número fora dos dados": confere os números escritos nos textos do case.

Uso:  python scripts/check_numbers.py case.json [texto.txt ...]

Todo número dos textos (título, resumo, desafio, solução, resultado, destaques e chamada
final) e dos arquivos de texto extras precisa existir nos dados do case: valores dos
indicadores, antes/depois, a diferença e a variação % entre eles, a quantidade de
funcionalidades, a escala da nota, o ano e o mês do período e os números do contexto.
O número pode estar arredondado às casas escritas ("R$ 1,2 mi" bate com 1.234.567).

Saída: 0 = tudo certo; 1 = há números suspeitos (listados); 2 = erro de uso ou de arquivo.
Não depende de bibliotecas externas.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import caselib as cl  # noqa: E402


def main(argv):
    if len(argv) < 2:
        sys.stderr.write("Uso: python %s case.json [texto.txt ...]\n" % os.path.relpath(__file__))
        return 2
    try:
        c = cl.load_case(argv[1])
    except (OSError, cl.CaseError) as e:
        sys.stderr.write("ERRO: %s\n" % e)
        return 2
    problems = cl.check_case_numbers(c)
    allowed = cl.allowed_numbers(c)
    for path in argv[2:]:
        try:
            with open(path, encoding="utf-8") as f:
                text = f.read()
        except OSError as e:
            sys.stderr.write("ERRO: %s\n" % e)
            return 2
        bad = cl.unknown_numbers(text, allowed)
        if bad:
            problems.append((os.path.basename(path), text[:80] + ("…" if len(text) > 80 else ""), bad))
    if not problems:
        print("OK: todos os números dos textos estão nos dados do case.")
        return 0
    print("Números que NÃO estão nos dados do case (corrija o texto ou confirme o dado com a pessoa):")
    for field, text, bad in problems:
        print("- %s: %s" % (field, ", ".join('"%s"' % b for b in bad)))
        print("    texto: %s" % text)
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
