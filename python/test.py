import ast
from py_helpers import Node as _Node

_code = """
import math
from abc import ABC, abstractmethod

GRAVITATIONAL_ACCELERATION = 9.81

class Projectile(ABC):
    __slots__ = ('__height', '__speed', '__angle')

    def __init__(self, speed, height, angle):
        self.__height = height
        self.__speed = speed
        self.__angle = math.radians(angle)   

    @property
    def height(self):
      return self.__height

    @height.setter
    @abstractmethod
    def height(self, new_height):
        self.__height = new_height

    def height(self):
      return ""
"""

# print(_Node(_code).find_class("Projectile").find_functions("height"))
print(_Node(_code).find_functions("height"))
# print(_Node(_code).find_class("Projectile").find_function("height").has_decorators("property"))

# print(ast.dump(ast.parse(_code), indent=4))
