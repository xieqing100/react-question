import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError
} from 'axios'
import { Toast as antdToast } from 'antd-mobile'

export type Response<T> =
  | {
      data: T;
      success: true;
      errorCode?: string;
      errorMessage?: string;
    }
  | {
      data?: T;
      success: false;
      errorCode: number;
      errorMessage: string;
    };

type ExtractKeys<T extends string> =
  T extends `${string}{${infer Key}}${infer Rest}`
    ? Key | ExtractKeys<Rest>
    : never;

type PathVariables<T extends string> = ExtractKeys<T> extends never
  ? Record<string, string | number>
  : Record<ExtractKeys<T>, string | number>;

type RequestConfig<
  D extends object,
  Q extends object,
  U extends string,
  P = PathVariables<U>
> = Omit<AxiosRequestConfig<D>, "url" | "params"> & {
  /**
   * @example '/api/:id' => pathVariables: { id: "1" }
   * @example '/api/:id/:name' => pathVariables: { id: "1", name: "2" }
   */
  url: U;
  ignoreAuth?: boolean; //不為true時 header需附帶Authentication value為token
  silentError?: boolean;
  throwError?: boolean;
  params?: Q;
  /**
   * @example '/api/:id' => { id: "1" }
   * @example '/api/:id/:name' => { id: "1", name: "2" }
   */
  pathVariables?: P;
};

export interface Request {
  <
    T,
    D extends object = any,
    Q extends object = any,
    U extends string = string,
    P = PathVariables<U>
  >(
    args: RequestConfig<D, Q, U, P>
  ): Promise<Response<T>>;
}

 // 自定义Toast类
 class Toast {
    // 此处调用antd框架显示弹窗提示
  static show = ({content = '', duration = 3}) => {
    return antdToast.show({ content, duration })
  }
}

// 创建axios实例
const instance: AxiosInstance = axios.create({
  baseURL: '/api/',
  timeout: 10000
})
// 拦截请求头
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token")
    const ignoreAuthStr = config.headers.get("ignoreAuth") as string
    const ignoreAuth = JSON.parse(ignoreAuthStr)
    // 根据请求头中的ignoreAuth判断是否带请求头token
    if (!ignoreAuth) {
      config.headers.set("Authentication", token)
    }
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error.response)
  }
)
// 拦截响应头
instance.interceptors.response.use(
  (response) => {
    const { data } = response
    if (response.status === 200) {
      return Promise.resolve(data)
    } else {
      return Promise.reject(response)
    }
  },
  (error: AxiosError) => {
    return Promise.reject(error.response)
  }
)
// 请求成功回调处理函数
const sucFun = (resData: Response<any>, isToast: boolean | undefined) => {
  if (!resData.success && isToast) {
    Toast.show({
      content: resData.errorMessage || '业务异常'
    })
  }
  return resData as Response<any>
}
// 请求失败回调处理函数
const errFun = (errData: AxiosError | AxiosResponse, isToast: boolean | undefined) => {
  try {
    if (errData?.status === 401) {
      isToast && Toast.show({ content: '登录失效' })
      localStorage.removeItem('Authentication')
      // router.navigate('/login', { replace: true })
    } else {
      isToast && Toast.show({ content: `请求失败` })
    }
  } catch (err) {
    Toast.show({ content: '未知错误' })
  }
  return errData as unknown as Response<any>

}


const request: Request = async <
  T = any,
  D extends object = any,
  Q extends object = any,
  U extends string = string,
  P = PathVariables<U>
>(
  args: RequestConfig<D, Q, U, P>
) => {
  const { 
    url,
    method, 
    data, 
    params = {}, 
    pathVariables = {}, 
    ignoreAuth,
    silentError,
    throwError
  } = args
  const pathArr = Object.keys(pathVariables as object)
  const pathUrl = `${url}/${pathArr.join('/')}` 
  const isToast = throwError || silentError
  const requesData: AxiosRequestConfig<D> = {
    url: pathUrl,
    method,
    data,
    params,
    headers: { ignoreAuth }
  }
  return instance.request(requesData)
  .then((resData: AxiosResponse | Response<any>) => sucFun(resData as Response<any>, isToast))
  .catch((err: AxiosError | AxiosResponse) => errFun(err, isToast))
};

export default request;
